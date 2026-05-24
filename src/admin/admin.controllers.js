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

export const leadsController = async (_req, res) => {
  try {
    const leads = await adminService.getAllLeads();
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
