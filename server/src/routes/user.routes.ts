import { Router } from 'express';
import { User } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { refreshUserLocation, resolveLocationFromCoords } from '../agents/user-profile';

const router = Router();

router.use(authMiddleware);

router.get('/settings', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      name: user.name ?? '',
      pronouns: user.pronouns ?? '',
      autoLocation: !!user.autoLocation,
      location: user.location ?? '',
      timezone: user.timezone ?? '',
      country: user.country ?? '',
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { name, pronouns, autoLocation, location } = req.body as {
      name?: string;
      pronouns?: string;
      autoLocation?: boolean;
      location?: string;
    };

    // Whitelist update fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates['name'] = name;
    if (pronouns !== undefined) updates['pronouns'] = pronouns;
    if (autoLocation !== undefined) updates['autoLocation'] = autoLocation;
    if (location !== undefined) updates['location'] = location;
    // When location is explicitly cleared, also wipe cached geo fields
    if (location === '') {
      updates['timezone'] = '';
      updates['country'] = '';
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select(
      '-passwordHash',
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      name: user.name ?? '',
      pronouns: user.pronouns ?? '',
      autoLocation: !!user.autoLocation,
      location: user.location ?? '',
      timezone: user.timezone ?? '',
      country: user.country ?? '',
    });
  } catch {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /user/refresh-location — immediately geo-resolves the caller's IP and persists the result
router.post('/refresh-location', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const clientIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      '';

    const geo = await refreshUserLocation(userId, clientIp);

    res.json({
      location: geo.location ?? '',
      timezone: geo.timezone ?? '',
      country: geo.country ?? '',
    });
  } catch {
    res.status(500).json({ error: 'Failed to refresh location' });
  }
});

// POST /user/location-by-coords — reverse-geocode browser GPS coords and persist
router.post('/location-by-coords', async (req: AuthRequest, res) => {
  try {
    const { lat, lon, timezone } = req.body as { lat?: number; lon?: number; timezone?: string };
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      res.status(400).json({ error: 'lat and lon are required' });
      return;
    }

    const userId = req.user!.userId;
    const geo = await resolveLocationFromCoords(lat, lon);
    if (!geo) {
      res.status(502).json({ error: 'Reverse geocoding failed' });
      return;
    }

    // timezone comes from the browser (Intl.DateTimeFormat().resolvedOptions().timeZone)
    const tz = timezone ?? null;
    await User.findByIdAndUpdate(userId, {
      location: geo.location,
      country: geo.country,
      ...(tz ? { timezone: tz } : {}),
    });

    res.json({ location: geo.location ?? '', country: geo.country ?? '', timezone: tz ?? '' });
  } catch {
    res.status(500).json({ error: 'Failed to save location' });
  }
});

export default router;
