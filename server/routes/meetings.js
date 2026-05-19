const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Meeting = require('../models/Meeting');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/meetings/create
router.post('/create', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const meetingId = uuidv4().substring(0, 8).toUpperCase();

    const meeting = await Meeting.create({
      meetingId,
      title: title || `${req.user.name}'s Meeting`,
      host: req.user._id,
      hostName: req.user.name,
    });

    res.status(201).json({
      meetingId: meeting.meetingId,
      title: meeting.title,
      hostName: meeting.hostName,
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Could not create meeting' });
  }
});

// @route   GET /api/meetings/:meetingId
router.get('/:meetingId', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (!meeting.isActive) {
      return res.status(400).json({ message: 'This meeting has ended' });
    }

    res.json({
      meetingId: meeting.meetingId,
      title: meeting.title,
      hostName: meeting.hostName,
      participantCount: meeting.participants.length,
      isActive: meeting.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/meetings/history/all
router.get('/history/all', protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({ host: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('meetingId title startedAt endedAt isActive participants');

    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/meetings/:meetingId/end
router.put('/:meetingId/end', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      meetingId: req.params.meetingId,
      host: req.user._id,
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found or unauthorized' });
    }

    meeting.isActive = false;
    meeting.endedAt = new Date();
    await meeting.save();

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
