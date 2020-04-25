import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';

import CreateAppointmentService from '../services/CreateAppointmentService';
import CancelAppointmentService from '../services/CancelAppointmentService';

import Cache from '../../lib/Cache';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const cacheKey = `user:${req.userID}:appointments:${page}`;

    const cached = await Cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const appointements = await Appointment.findAll({
      where: { user_id: req.userID, canceled_at: null },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'date', 'past', 'cancelable'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    await Cache.set(cacheKey, appointements);

    return res.json(appointements);
  }

  async store(req, res) {
    const { provider_id, date } = req.body;

    const appointements = await CreateAppointmentService.run({
      provider_id,
      user_id: req.userID,
      date,
    });

    return res.json(appointements);
  }

  async destroy(req, res) {
    const appointment = await CancelAppointmentService.run({
      user_id: req.userID,
      provider_id: req.params.id,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
