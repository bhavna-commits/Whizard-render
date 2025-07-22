import dotenv from "dotenv";
dotenv.config();
import { generate6DigitOTP } from "../../utils/otpGenerator.js";
import { isString } from "../../middleWares/sanitiseInput.js";
import User from "../../models/user.model.js";
import Template from "../../models/templates.model.js";

export const apiKeyMiddleware = async (req, res, next) => {
	const key = req.header("x-api-key");
	if (key && isString(key)) {
		const exists = await User.findOne({ authTemplateToken: key });
		if (exists) {
			req.user = exists;
			return next();
		}
	}
	return res.status(401).json({ success: false, message: "Invalid Token" });
};

export const rateLimitMiddleware = (() => {
	const requests = {};
	const WINDOW_SIZE = 15 * 60 * 1000;
	const MAX_REQUESTS = 100;

	return (req, res, next) => {
		const ip = req.ip;
		const now = Date.now();
		if (!requests[ip]) requests[ip] = [];
		requests[ip] = requests[ip].filter((ts) => now - ts < WINDOW_SIZE);
		if (requests[ip].length >= MAX_REQUESTS)
			return res
				.status(429)
				.json({ success: false, message: "Too many requests" });
		requests[ip].push(now);
		next();
	};
})();

export const validateTemplateInput = (body) => {
	if (!isString(body.to)) return "Invalid or missing phone number";
	if (!isString(body.templateName)) return "Invalid or missing template name";
	return null;
};

export const sendAuthTemplateOTP = async (req, res) => {
	const error = validateTemplateInput(req.body);
	if (error) return res.status(400).json({ success: false, message: error });

	const template = await Template.findOne({
		name: req.body.templateName,
		useradmin: req.user.unique_id,
	});

	if (!template) return;

	const otp = generate6DigitOTP();
	const payload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: req.body.to,
		type: "template",
		template: {
			name: template.name,
			language: { code: template.language.code || "en_US" },
			components: [
				{ type: "body", parameters: [{ type: "text", text: otp }] },
				{
					type: "button",
					sub_type: "url",
					index: "0",
					parameters: [{ type: "text", text: otp }],
				},
			],
		},
    };
    
    const FB_PHONE_ID = req.user?.FB_PHONE_NUMBERS?.find(
		(n) => n.selected,
	)?.phone_number_id;

	try {
		const response = await fetch(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${FB_PHONE_ID}/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${req.user.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
		);

		const data = await response.json();
        if (!response.ok) {
            console.log(data);
            throw data.error;
        };

		res.json({ success: true, data, otp });
    } catch (err) {
        console.log(err.message);
		res.status(502).json({
			success: false,
			message: err.message,
		});
	}
};

/*
Example CURL usage:

*********************************

curl -X POST https://console.whizardapi.com/api/public/send-auth-template-otp \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
    "to": "917986407867",
    "templateName": "zero_tap_app"
}'

*********************************
*/
