The client and the server communicate with each other by sending
WebSocket messages. The message must be a serialized JSON object with
the `type` field indicating the type of the event.

## Client-sent events

### `join`

Sent right after establishing the connection with the server. Other
events must fail if this one wasn't sent.

* `nickname` - the nickname to be used by the chatter; must be unique
  and within the allowed by the server length

### `message`

Sent when the user sends the message.

* `text` - text of the message; must be within the allowed by the
  server length
* `attachment` - optional attachment ID

### `edit-message`

Sent after the user edited the message.

The event has the same arguments as `message` with the following
additions:

* `id` - ID of the message to be updated

### `delete-message`

Sent when the user deletes the message.

* `id` - ID of the message to be deleted

### `add-attachment`

Sent when the user attaches a file to the message.

* `data` - base64-encoded data URL of the file to be sent; must be
  within the allowed by the server size

### `fetch-attachment`

Sent when the user wants to download the attachment.

* `id` - ID of the attachment to be downloaded

## Server-sent events

### `welcome`

Sent when the server approves the user.

### `bye`

Sent when the user is kicked. The connection must be closed right
after the event is sent.

### `error`

Sent when a user-caused error occurs. The connection must be closed
right after the event is sent.

* `message` - cause of the error

### `message`

Sent when a new message arrives.

* `sender` - optional sender nickname
* `id` - optional message ID
* `text` - text of the message
* `attachment` - optional attachment ID
* `timestamp` - time at which the message was first sent

### `messages`

Sent when the server wants to send many messages at a time (like, for
example, to the user than just joined).

* `messages` - array of objects with the structure identical to the
  `message` event
* `prepend` - if true, insert the messages in the beginning of the
  conversation instead of the end

### `message-updated`

Sent when a message gets updated.

The event has the same arguments as `message`.

### `message-deleted`

Sent when a message gets deleted.

* `sender` - nickname of the sender of the deleted message
* `id` - ID of the deleted message

### `attachment-added`

Sent when the server finishes downloading the attachment the sent by
the user.

* `id` - ID of the attachment

### `attachment-fetched`

Sent when the server finishes uploading the attachment to the user

* `data` - base64-encoded data URL of the attachment's file
