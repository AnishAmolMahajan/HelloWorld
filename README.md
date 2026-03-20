# HelloWorld
Simple HTML Page

## Secure Chat Option

This project now includes a secure chat page with:
- Name + fixed password login
- Chat history saved in a separate file per user
- Server-side storage under `chat_history/`

### Run

1. Start the server:

```bash
node chat-server.js
```

2. Open:

`http://localhost:3000`

3. Click `Secure Chat`.

### Fixed Users

Configured in `chat-server.js`:
- `Anish` / `anish123`
- `Riya` / `riya123`
- `Arjun` / `arjun123`

You can edit the `USERS` object in `chat-server.js` to change names/passwords.