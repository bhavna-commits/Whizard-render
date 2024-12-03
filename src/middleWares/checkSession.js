export const checkSession = (req, res, next) => {
  if (req.session.user) {
    // Render the dashboard if session exists
    next();
  } else {
    // Redirect to login if session does not exist
    res.redirect("/login");
  }
};
