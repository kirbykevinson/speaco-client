class Chat {
	constructor() {
		this.serverIp = null;
		this.nickname = null;
		
		this.socket = null;
		
		this._messageId = null;
		this._attachmentId = null;
		
		this.previousMessage = "";
		this.previousAttachmentId = null;
		
		this.eventHandlers = {
			"welcome": this.onWelcome,
			"bye": this.onBye,
			"error": this.onError,
			"message": this.onMessage,
			"messages": this.onMessages,
			"message-updated": this.onMessageUpdated,
			"message-deleted": this.onMessageDeleted,
			"attachment-added": this.onAttachmentAdded,
			"attachment-fetched": this.onAttachmentFetched
		};
		
		this.limits = {
			nicknameLength: 32,
			historySize: 128,
			messageLength: 1024,
			attachmentSize: 5 * 2 ** 20
		};
		
		this.elements = {
			registration: document.querySelector("#registration"),
			chat: document.querySelector("#chat"),
			
			registrationForm: document.querySelector("#registration-form"),
			chatForm: document.querySelector("#chat-form"),
			
			serverIp: document.querySelector("#server-ip"),
			nickname: document.querySelector("#nickname"),
			
			joinButton: document.querySelector("#join-button"),
			cancelEditButton: document.querySelector("#cancel-edit-button"),
			attachButton: document.querySelector("#attach-button"),
			unattachButton: document.querySelector("#unattach-button"),
			sendButton: document.querySelector("#send-button"),
			
			messages: document.querySelector("#messages"),
			messageInput: document.querySelector("#message-input"),
		};
		
		this.elements.nickname.maxLength = this.limits.nicknameLength;
		this.elements.messageInput.maxLength = this.limits.messageLength;
		
		this.elements.registrationForm.addEventListener("submit", (event) => {
			event.preventDefault();
			
			this.join();
		});
		this.elements.chatForm.addEventListener("submit", (event) => {
			event.preventDefault();
			
			this.sendMessage();
		});
		
		this.elements.cancelEditButton.addEventListener("click", (event) => {
			this.setEditedMessage(null);
		});
		
		this.elements.attachButton.addEventListener("click", (event) => {
			event.preventDefault();
			
			this.attachFile();
		});
		this.elements.unattachButton.addEventListener("click", (event) => {
			event.preventDefault();
			
			this.attachmentId = null;
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
	
	get attachmentId() {
		return this._attachmentId;
	}
	set attachmentId(id) {
		this._attachmentId = id;
		
		if (id != null) {
			this.elements.attachButton.hidden = true;
			this.elements.unattachButton.hidden = false;
		} else {
			this.elements.attachButton.hidden = false;
			this.elements.unattachButton.hidden = true;
		}
		
		this.unlock();
	}
	
	error(message, error) {
		alert("Error: " + message);
		
		this.close();
	}
	
	open() {
		this.elements.registration.hidden = true;
		this.elements.chat.hidden = false;
		
		this.unlock();
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
		
		this.unlock();
		this.reset();
	}
	
	reset() {
		this.previousMessage = "";
		this.previousAttachmentId = null;
		
		this.setEditedMessage(null);
	}
	
	lock() {
		this.elements.joinButton.disabled = true;
		this.elements.cancelEditButton.disabled = true;
		this.elements.attachButton.disabled = true;
		this.elements.unattachButton.disabled = true;
		this.elements.sendButton.disabled = true;
	}
	unlock() {
		this.elements.joinButton.disabled = false;
		this.elements.cancelEditButton.disabled = false;
		this.elements.attachButton.disabled = false;
		this.elements.unattachButton.disabled = false;
		this.elements.sendButton.disabled = false;
	}
	
	join() {
		this.lock();
		
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
		
		this.socket.addEventListener("error", () => {
			this.error("couldn't connect to the server");
		});
		this.socket.addEventListener("close", () => {
			this.close();
		});
		
		this.socket.addEventListener("open", () => {
			this.sendEvent("join", {
				nickname: this.nickname
			});
		});
		
		this.socket.addEventListener("message", (message) => {
			let event = null;
			
			try {
				event = JSON.parse(message.data);
			} catch (error) {
				this.error("malformed server-sent event");
				
				console.log(message.data);
				
				return;
			}
			
			if (!event || typeof event != "object") {
				this.error("server-sent event is not an object");
				
				console.log(event);
				
				return;
			}
			
			if (!("type" in event)) {
				this.error("server-sent event without a type");
				
				console.log(event);
				
				return;
			}
			
			if (!this.eventHandlers.hasOwnProperty(event.type)) {
				this.error("illegal server-sent event type");
				
				console.log(event);
				
				return;
			}
			
			this.eventHandlers[event.type].call(this, event);
		});
	}
	
	sendEvent(type, data) {
		if (!data || typeof data != "object") {
			throw new TypeError("client-sent event must be an object");
		}
		
		data.type = type;
		
		this.socket.send(JSON.stringify(data));
	}
	
	onWelcome() {
		this.open();
	}
	onBye() {
		alert("You've been kicked");
		
		this.close();
	}
	onError(event) {
		this.error(event.message);
	}
	onMessage(event) {
		if (!this.checkMessageEvent(event)) {
			return;
		}
		
		this.recieveMessage(event);
	}
	onMessages(event) {
		if (!Array.isArray(event.messages)) {
			this.error("server-sent messages aren't an array");
			
			console.log(event);
			
			return;
		}
		
		let insertBefore = null;
		
		if (event.prepend) {
			insertBefore = this.elements.messages.querySelectorAll(
				".message"
			)[0];
		}
		
		for (const message of event.messages) {
			if (!this.checkMessageEvent(message)) {
				return;
			}
			
			this.recieveMessage(message, insertBefore);
		}
	}
	onMessageUpdated(event) {
		if (!this.checkMessageEvent(event)) {
			return;
		}
		
		this.updateMessage(event);
	}
	onMessageDeleted(event) {
		if (typeof event.sender != "string") {
			this.error("server-sent message sender isn't a string");
			
			console.log(event);
			
			return;
		}
		if (typeof event.id != "number") {
			this.error("server-sent message id isn't a number");
			
			console.log(event);
			
			return;
		}
		
		this.deleteMessage(event.sender, event.id);
	}
	onAttachmentAdded(event) {
		if (typeof event.id != "string") {
			this.error("server-sent attachment id isn't a string");
			
			console.log(event);
			
			return;
		}
		
		this.attachmentId = event.id;
	}
	onAttachmentFetched(event) {
		if (event.name && typeof event.name != "string") {
			this.error("server-sent attachment name isn't a string");
			
			console.log(event);
			
			return;
		}
		
		if (event.data && typeof event.data != "string") {
			this.error("server-sent attachment data isn't a string");
			
			console.log(event);
			
			return;
		}
		
		if (!event.data) {
			alert("The attachment is too old to download");
			
			return;
		}
		
		this.downloadAttachment(event);
	}
	
	checkMessageEvent(event) {
		if (event.sender && typeof event.sender != "string") {
			this.error("invalid server-sent message sender");
			
			console.log(event);
			
			return false;
		}
		
		if (event.id != null && typeof event.id != "number") {
			this.error("server-sent message id isn't a number");
			
			console.log(event);
			
			return;
		}
		
		if (typeof event.text != "string") {
			this.error("server-sent message text isn't a string");
			
			console.log(event);
			
			return false;
		}
		
		if (event.attachment && typeof event.attachment != "string") {
			this.error("server-sent message attachment isn't a string");
			
			console.log(event);
			
			return false;
		}
		
		if (typeof event.timestamp != "string") {
			this.error("server-sent message timestamp isn't a string");
			
			console.log(event);
			
			return;
		}
		
		return true;
	}
	
	sendMessage() {
		const message = this.elements.messageInput.value.trim();
		
		if (message.length <= 0 && !this.attachmentId) {
			return;
		}
		
		if (this._messageId == null) {
			this.sendEvent("message", {
				text: message,
				attachment: this.attachmentId
			});
		} else {
			this.sendEvent("edit-message", {
				id: this._messageId,
				text: message,
				attachment: this.attachmentId
			});
		}
		
		this.setEditedMessage(null);
	}
	setEditedMessage(message) {
		if (message) {
			if (this._messageId != null) {
				this.setEditedMessage(null);
			}
			
			this._messageId = message.id;
			
			this.elements.cancelEditButton.hidden = false;
			this.elements.sendButton.innerText = "☑️";
			
			this.previousMessage = this.elements.messageInput.value;
			this.previousAttachmentId = this.attachmentId;
			
			this.elements.messageInput.value = message.text;
			this.attachmentId = message.attachment;
		} else {
			this._messageId = null;
			
			this.elements.cancelEditButton.hidden = true;
			this.elements.sendButton.innerText = "➡️";
			
			this.elements.messageInput.value = this.previousMessage;
			this.attachmentId = this.previousAttachmentId;
			
			this.previousMessage = "";
			this.previousAttachmentId = null;
		}
	}
	
	recieveMessage(message, insertBefore) {
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
		
		this.renderMessage(message, container);
		
		this.elements.messages.insertBefore(container, insertBefore || null);
		
		const historySize = this.elements.messages.children.length;
		
		if (historySize > this.limits.historySize) {
			const buttons = this.elements.messages.querySelectorAll(
				".message"
			)[
				historySize - this.limits.historySize - 1
			].querySelector(".buttons");
			
			if (buttons) {
				buttons.remove();
			}
		}
		
		if (shouldScroll) {
			this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
		}
	}
	renderMessage(message, container) {
		container.innerHTML = "";
		
		container.chat = message;
		
		// ---
		
		if (message.sender) {
			const senderElement = document.createElement("span");
			
			senderElement.className = "sender";
			senderElement.innerText = message.sender;
			
			if (message.sender == this.nickname) {
				senderElement.className += " self";
			}
			
			container.appendChild(senderElement);
		} else {
			container.className += " meta";
		}
		
		// ---
		
		const textElement = document.createElement("span");
		
		textElement.className = "text";
		textElement.innerText = message.text;
		
		textElement.innerHTML = textElement.innerHTML.replace(
			/\S*:\/\/\S*/g,
			"<a href=\"$&\">$&</a>"
		);
		
		container.appendChild(textElement);
		
		// ---
		
		if (message.attachment) {
			const attachmentElement = document.createElement("button");
			
			attachmentElement.innerText = "Download attachment";
			
			attachmentElement.addEventListener("click", () => {
				this.sendEvent("fetch-attachment", {
					id: container.chat.attachment
				});
			});
			
			container.appendChild(attachmentElement);
		}
		
		// ---
		
		if (message.sender == this.nickname) {
			const buttonContainer = document.createElement("span");
			
			buttonContainer.className = "buttons";
			
			const editButton = document.createElement("button")
			
			editButton.innerText = "🖋️";
			
			editButton.addEventListener("click", () => {
				this.setEditedMessage(container.chat);
			});
			
			const deleteButton = document.createElement("button")
			
			deleteButton.innerText = "❌";
			
			deleteButton.addEventListener("click", () => {
				if (confirm("Do you really want to delete this message?")) {
					this.sendEvent("delete-message", {
						id: container.chat.id
					});
				}
			});
			
			buttonContainer.appendChild(editButton);
			buttonContainer.appendChild(deleteButton);
			
			container.appendChild(buttonContainer);
		}
		
		// ---
		
		const timestampElement = document.createElement("span");
		
		timestampElement.className = "timestamp";
		timestampElement.innerText =
			new Date(message.timestamp).toLocaleString();
		
		if (message.edited) {
			timestampElement.innerText += " (Edited)";
		}
		
		container.appendChild(timestampElement);
	}
	
	updateMessage(message) {
		for (const target of document.querySelectorAll(".message")) {
			if (
				target.chat.sender == message.sender &&
				target.chat.id == message.id
			) {
				this.renderMessage(message, target);
				
				return;
			}
		}
	}
	deleteMessage(sender, id) {
		for (const message of document.querySelectorAll(".message")) {
			if (message.chat.sender == sender && message.chat.id == id) {
				message.remove();
			}
		}
	}
	
	attachFile() {
		const chooser = document.createElement("input");
		
		chooser.type = "file";
		
		chooser.addEventListener("change", () => {
			const file = chooser.files[0]
			
			if (file.size > this.limits.attachmentSize / 1.5) {
				alert("The file is too large to attach");
				
				return;
			}
			
			this.lock();
			
			const reader = new FileReader();
			
			reader.addEventListener("error", () => {
				this.error("couldn't read the file");
			});
			
			reader.addEventListener("load", () => {
				this.sendEvent("add-attachment", {
					name: file.name,
					data: reader.result
				});
			});
			
			reader.readAsDataURL(file);
		});
		
		chooser.click();
	}
	downloadAttachment(attachment) {
		const link = document.createElement("a");
		
		link.href = attachment.data;
		link.download = attachment.name || "attachment";
		
		link.click();
	}
}

window.chat = new Chat();
