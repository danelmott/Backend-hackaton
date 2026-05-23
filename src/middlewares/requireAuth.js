import passport from 'passport'

export const requireAuth = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'No autorizado' })
        }
        req.user = user
        next()
    })(req, res, next)
}

export const requireRefresh = (req, res, next) => {
    passport.authenticate('jwt-refresh', { session: false }, (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Refresh token inválido' })
        }
        req.user = user
        next()
    })(req, res, next)
}