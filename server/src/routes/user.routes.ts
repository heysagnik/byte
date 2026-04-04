import { Router } from 'express';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/settings', async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      name: user.name || '',
      pronouns: user.pronouns || '',
      autoLocation: !!user.autoLocation,
      location: user.location || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req: any, res) => {
  try {
    const { name, pronouns, autoLocation, location } = req.body;
    
    // Whitelist update fields
    const updates: Partial<{ name: string; pronouns: string; autoLocation: boolean; location: string }> = {};
    if (name !== undefined) updates.name = name;
    if (pronouns !== undefined) updates.pronouns = pronouns;
    if (autoLocation !== undefined) updates.autoLocation = autoLocation;
    if (location !== undefined) updates.location = location;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      name: user.name || '',
      pronouns: user.pronouns || '',
      autoLocation: !!user.autoLocation,
      location: user.location || ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
