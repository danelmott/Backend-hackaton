export const requireRole = (...roles) => {
    return (req, res, next) => {
        const userRoles = req.user?.roles ?? []
        const hasRole = roles.some((role) => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ message: 'Acceso denegado' })
        }
        next()
    }
}