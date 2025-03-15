export const checkSession = (req, res, next) => {
	if (req.session?.user && req.session?.addedUser) {
		
		// If both user and addedUser are present, destroy the session to ensure one user at a time
		req.session.destroy((err) => {
			if (err) {
				return next(err);
			}
			// Redirect to login page after destroying the session
			res.redirect("/login");
		});
	} else if (req.session?.user || req.session?.addedUser) {
		console.log(req.session);
		// Continue if either user or addedUser is present, but not both
		next();
	} else {
		// Redirect to login if neither is found
		res.redirect("/login");
	}
};
