import userRoutes from "./backEnd-Routes/user.backEnd.routes.js";
import userfrontEndRoutes from "./frontEnd-Routes/user.frontEnd.routes.js";
import tempalteFrontEndRoutes from "./frontEnd-Routes/template.frontEnd.routes.js";
import contactFrontEndRoutes from "./frontEnd-Routes/contactList.frontEnd.routes.js";
import templatesRoutes from "./backEnd-Routes/template.backEnd.routes.js";
import contactListRoute from "./backEnd-Routes/contactList.backEnd.routes.js";
import settingsFrontRoute from "./frontEnd-Routes/setting.frontEnd.routes.js";
import settingsbackEndRoute from "./backEnd-Routes/settings.backEnd.routes.js";
import faceBookBackEndRoute from "./backEnd-Routes/facebook.backEnd.routes.js";
import reportsFrontEndRoute from "./frontEnd-Routes/reports.frontEnd.routes.js";
import reportsBackEndRoute from "./backEnd-Routes/reports.backEnd.routes.js";
import dashboardBackEndRoutes from "./backEnd-Routes/dashboard.backEnd.routes.js";
import chatsFrontEndRoutes from "./frontEnd-Routes/chats.frontEnd.routes.js";
import chatsBackEndRoutes from "./backEnd-Routes/chats.backEnd.routes.js"

import { checkSession } from "./middleWares/checkSession.js";
import app from "./static.app.js";

app.use("/api/facebook", faceBookBackEndRoute);
app.use("/", userfrontEndRoutes);
app.use("/api/users", userRoutes);

app.use("/", checkSession, tempalteFrontEndRoutes);
app.use("/chats", checkSession, chatsFrontEndRoutes);
app.use("/api/chats", checkSession, chatsBackEndRoutes);
app.use("/reports", checkSession, reportsFrontEndRoute);
app.use("/settings", checkSession, settingsFrontRoute);
app.use("/contact-list", checkSession, contactFrontEndRoutes);
app.use("/api/templates", checkSession, templatesRoutes);
app.use("/api/contact-list", checkSession, contactListRoute);
app.use("/api/settings", checkSession, settingsbackEndRoute);
app.use("/api/reports", checkSession, reportsBackEndRoute);
app.use("/api/dashboard", checkSession, dashboardBackEndRoutes);

app.use((req, res) => {
	res.status(404).render("errors/notFound");
});

export default app;
