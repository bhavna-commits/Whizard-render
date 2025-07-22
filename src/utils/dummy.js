export const dummyPayload = {
	object: "page",
	entry: [
		{
			id: "PAGE_ID", // Facebook Page ID
			time: Date.now(),
			messaging: [
				{
					sender: {
						id: "USER_ID", // The ID of the user sending the message
					},
					recipient: {
						id: "PAGE_ID", // The ID of the page receiving the message
					},
					timestamp: Date.now(),
					message: {
						mid: "m_mid.1460856178153:ed81099e15d3f4f233", // Unique message ID
						text: "Hello, this is a test message", // Example message text
					},
				},
				{
					sender: {
						id: "USER_ID",
					},
					recipient: {
						id: "PAGE_ID",
					},
					timestamp: Date.now(),
					delivery: {
						mids: ["m_mid.1460856178153:ed81099e15d3f4f233"], // Message ID that was delivered
						watermark: Date.now(),
						seq: 1001,
					},
				},
				{
					sender: {
						id: "USER_ID",
					},
					recipient: {
						id: "PAGE_ID",
					},
					timestamp: Date.now(),
					read: {
						watermark: Date.now(), // Timestamp of when the message was read
						seq: 1002,
					},
				},
			],
		},
	],
};
