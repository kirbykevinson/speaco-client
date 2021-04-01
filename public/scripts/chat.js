class Chat {
	constructor() {
		this.elements = {
			registration: document.querySelector(".registration"),
			chat: document.querySelector(".chat"),
			
			serverIp: document.querySelector("#server-ip"),
			nickname: document.querySelector("#nickname"),
			
			messages: document.querySelector(".messages"),
			message: document.querySelector("#message"),
		};
		
		this.serverIp = null;
		this.nickname = null;
		
		this.socket = null;
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
		this.elements.message.value = "";
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
			if (typeof event.timestamp != "string") {
				this.error("server-sent message timestamp isn't a string");
				
				console.log(event);
				
				return;
			}
			
			this.recieveMessage(
				event.sender,
				event.text,
				new Date(event.timestamp)
			);
			
			break;
		default:
			this.error("illegal server-sent event type");
			
			console.log(event);
			
			break;
		}
	}
	
	sendMessage() {
		this.sendEvent("message", {
			text: this.elements.message.value
		});
		
		this.elements.message.value = "";
	}
	recieveMessage(sender, message, timestamp) {
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
			
			container.appendChild(senderElement);
		} else {
			container.className += " meta";
		}
		
		const text = document.createTextNode(message);
		
		container.appendChild(text);
		
		const timestampElement = document.createElement("span");
		
		timestampElement.className = "timestamp";
		timestampElement.innerText = timestamp.toLocaleString();
		
		container.appendChild(timestampElement);
		
		container.innerHTML = container.innerHTML.replace(/\n/g, "<br>");
		
		this.elements.messages.appendChild(container);
		
		if (shouldScroll) {
			this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
		}
	}
}

window.chat = new Chat();
