class Chat {
	constructor() {
		this.elements = {
			registration: document.querySelector("#registration"),
			chat: document.querySelector("#chat"),
			
			registrationForm: document.querySelector("#registration-form"),
			chatForm: document.querySelector("#chat-form"),
			
			serverIp: document.querySelector("#server-ip"),
			nickname: document.querySelector("#nickname"),
			
			joinButton: document.querySelector("#join-button"),
			sendButton: document.querySelector("#send-button"),
			attachButton: document.querySelector("#attach-button"),
			unattachButton: document.querySelector("#unattach-button"),
			
			messages: document.querySelector("#messages"),
			messageInput: document.querySelector("#message-input"),
		};
		
		this.serverIp = null;
		this.nickname = null;
		
		this.socket = null;
		
		this.attachmentId = null;
		
		this.elements.registrationForm.addEventListener(
			"submit",
			
			(event) => {
				event.preventDefault();
				
				this.join();
			}
		);
		this.elements.chatForm.addEventListener("submit", (event) => {
			event.preventDefault();
			
			this.sendMessage();
		});
		
		this.elements.attachButton.addEventListener("click", (event) => {
			event.preventDefault();
			
			this.attachFile();
		});
		this.elements.unattachButton.addEventListener("click", (event) => {
			event.preventDefault();
			
			this.unattachFile();
		});
		
		// We assume that if the device has a mouse, it also has a
		// keyboard. This is not the right way to do it, but there isn't a
		// better one
		
		if (window.matchMedia("(hover: hover)").matches) {
			this.elements.messageInput.addEventListener("keydown", (event) => {
				if (event.code == "Enter" && !event.shiftKey) {
					event.preventDefault();
					
					this.elements.sendButton.click();
				}
			});
		}
		
		this.close();
	}
	
	error(message, error) {
		alert("Error: " + message);
		
		this.close();
	}
	
	open() {
		this.elements.registration.hidden = true;
		this.elements.chat.hidden = false;
	}
	close() {
		if (this.socket) {
			if (this.socket.readyState != WebSocket.CLOSED) {
				this.socket.close();
			}
			
			this.socket = null;
		}
		
		this.elements.registration.hidden = false;
		this.elements.chat.hidden = true;
		
		this.elements.messages.innerHTML = "";
		this.elements.messageInput.value = "";
		
		this.unattachFile();
	}
	
	join() {
		if (this.socket) {
			this.error("already connected");
			
			return;
		}
		
		this.serverIp =
			this.elements.serverIp.value ||
			this.elements.serverIp.placeholder;
		this.nickname =
			this.elements.nickname.value ||
			this.elements.nickname.placeholder;
		
		this.socket = new WebSocket("ws://" + this.serverIp);
		
		this.socket.addEventListener("error", (event) => {
			this.error("couldn't connect to the server");
		});
		this.socket.addEventListener("close", (event) => {
			this.close();
		});
		
		this.socket.addEventListener("open", (event) => {
			this.sendEvent("join", {
				nickname: this.nickname
			});
		});
		
		this.socket.addEventListener("message", (event) => {
			let parsedEvent = null;
			
			try {
				parsedEvent = JSON.parse(event.data);
			} catch (error) {
				this.error("malformed server-sent event");
				
				console.log(event.data);
				
				return;
			}
			
			if (!parsedEvent || typeof parsedEvent != "object") {
				this.error("server-sent event is not an object");
				
				return;
			}
			
			if (!("type" in parsedEvent)) {
				this.error("server-sent event without a type");
				
				return;
			}
			
			this.recieveEvent(parsedEvent);
		});
	}
	
	sendEvent(type, data) {
		if (!data || typeof data != "object") {
			throw new TypeError("client-sent event must be an object");
		}
		
		data.type = type;
		
		this.socket.send(JSON.stringify(data));
	}
	recieveEvent(event) {
		switch (event.type) {
		case "welcome":
			this.open();
			
			break;
		case "bye":
			alert("You've been kicked");
			
			this.close();
			
			break;
		case "error":
			this.error(event.message);
			
			break;
		case "message":
			if (event.sender && typeof event.sender != "string") {
				this.error("invalid server-sent message sender");
				
				console.log(event);
				
				return;
			}
			if (typeof event.text != "string") {
				this.error("server-sent message text isn't a string");
				
				console.log(event);
				
				return;
			}
			if (event.attachment && typeof event.attachment != "string") {
				this.error("server-sent message attachment isn't a string");
				
				console.log(event);
				
				return;
			}
			if (typeof event.timestamp != "string") {
				this.error("server-sent message timestamp isn't a string");
				
				console.log(event);
				
				return;
			}
			
			this.recieveMessage(
				event.sender,
				event.text,
				event.attachment,
				new Date(event.timestamp)
			);
			
			break;
		case "attachment-fetched":
			if (typeof event.data != "string") {
				this.error("server-sent attachment data isn't a string");
				
				console.log(event);
				
				return;
			}
			
			this.downloadAttachment(event.data);
			
			break;
		default:
			this.error("illegal server-sent event type");
			
			console.log(event);
			
			break;
		}
	}
	
	sendMessage() {
		this.sendEvent("message", {
			text: this.elements.messageInput.value
		});
		
		this.elements.messageInput.value = "";
	}
	recieveMessage(sender, text, attachment, timestamp) {
		// The messages should be scrolled only if the user didn't scroll
		// them manually, so we need to detect if that happened
		
		let shouldScroll = false;
		
		const oldScroll = this.elements.messages.scrollTop;
		
		this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
		
		if (this.elements.messages.scrollTop == oldScroll) {
			shouldScroll = true;
		} else {
			this.elements.messages.scrollTop = oldScroll;
		}
		
		const container = document.createElement("p");
		
		container.className = "message";
		
		if (sender) {
			const senderElement = document.createElement("span");
			
			senderElement.className = "sender";
			senderElement.innerText = sender;
			
			if (sender == this.nickname) {
				senderElement.className += " self";
			}
			
			container.appendChild(senderElement);
		} else {
			container.className += " meta";
		}
		
		const textElement = document.createElement("span");
		
		textElement.className = "text";
		textElement.innerText = text;
		textElement.innerHTML = textElement.innerHTML.replace(/\n/g, "<br>");
		
		container.appendChild(textElement);
		
		if (attachment) {
			const attachmentElement = document.createElement("button");
			
			attachmentElement.innerText = "Download attachment";
			
			attachmentElement.addEventListener("click", () => {
				this.sendEvent("fetch-attachment", {
					id: attachment
				});
			});
			
			container.appendChild(attachmentElement);
		}
		
		const timestampElement = document.createElement("span");
		
		timestampElement.className = "timestamp";
		timestampElement.innerText = timestamp.toLocaleString();
		
		container.appendChild(timestampElement);
		
		this.elements.messages.appendChild(container);
		
		if (shouldScroll) {
			this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
		}
	}
	
	attachFile() {
		this.elements.attachButton.hidden = true;
		this.elements.unattachButton.hidden = false;
	}
	unattachFile() {
		this.attachmentId = null;
		
		this.elements.attachButton.hidden = false;
		this.elements.unattachButton.hidden = true;
	}
	
	downloadAttachment(data) {
		const link = document.createElement("a");
		
		link.href = data;
		link.target = "_blank";
		
		link.click();
	}
}

window.chat = new Chat();
