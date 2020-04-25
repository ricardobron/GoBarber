import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import Appointment from '../models/Appointment';

import Notification from '../schemas/Notification';

import Cache from '../../lib/Cache';

class CreateAppointmentService {
  async run({ provider_id, user_id, date }) {
    /**
     *  Check if provider_id is a provider
     */

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      throw new Error('You can only create appointments with providers');
    }

    if (isProvider.id === user_id) {
      throw new Error('You cant create appointment himself');
    }

    const hourStart = startOfHour(parseISO(date));

    /**
     * Check for past dates
     */

    if (isBefore(hourStart, new Date())) {
      throw new Error('Past dates are not permitted');
    }

    /**
     * Check date availability
     */
    const CheckAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (CheckAvailability) {
      throw new Error('Appointment date is not availability');
    }

    const appointements = await Appointment.create({
      user_id,
      provider_id,
      date,
    });

    /**
     * Notify appointment provider
     */

    const user = await User.findByPk(user_id);

    const formatedDate = format(hourStart, "'dia' dd 'de' MMMM', às' H:mm'h'", {
      locale: pt,
    });

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formatedDate}`,
      user: provider_id,
    });

    /**
     *
     * INVALIDATE CACHE
     */

    await Cache.invalidatePrefix(`user:${user_id}:appointments`);

    return appointements;
  }
}

export default new CreateAppointmentService();
