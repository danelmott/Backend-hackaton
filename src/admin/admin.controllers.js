import * as adminService from './admin.service.js';

export const dashboardController = async (_req, res) => {
  try {
    const data = await adminService.getDashboardStats();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[admin/dashboard]', error);
    return res.status(500).json({ message: 'Error al obtener dashboard' });
  }
};

export const leadsController = async (req, res) => {
  try {
    const { urgency, eligible, product } = req.query;
    const leads = await adminService.getAllLeads({ urgency, eligible, product });
    return res.status(200).json({ leads });
  } catch (error) {
    console.error('[admin/leads]', error);
    return res.status(500).json({ message: 'Error al obtener leads' });
  }
};

export const userDetailController = async (req, res) => {
  try {
    const user = await adminService.getUserDetail(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error('[admin/users/:id]', error);
    return res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

export const notificationsStreamController = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  } else {
    res.write(': connected\n\n');
  }

  let lastCheck = new Date();
  const seenKeys = new Set();
  let closed = false;

  const send = (event, data) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { serverTime: lastCheck.toISOString() });

  const pollMs = Number(process.env.ADMIN_SSE_POLL_MS) || 5000;
  const heartbeatMs = 25000;

  const pollInterval = setInterval(async () => {
    if (closed) return;
    try {
      const checkpoint = new Date();
      const notifications = await adminService.pollHotLeadNotifications(lastCheck);
      lastCheck = checkpoint;

      for (const notification of notifications) {
        const key = `${notification.userId}:${notification.updatedAt}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        send('hot_lead', notification);
      }
    } catch (error) {
      console.error('[admin/notifications/stream] poll', error);
      send('error', { message: 'Error al consultar leads' });
    }
  }, pollMs);

  const heartbeatInterval = setInterval(() => {
    send('ping', { t: Date.now() });
  }, heartbeatMs);

  req.on('close', () => {
    closed = true;
    clearInterval(pollInterval);
    clearInterval(heartbeatInterval);
  });
};
