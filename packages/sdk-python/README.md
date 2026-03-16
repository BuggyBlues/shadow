# Shadow Python SDK

Python client for the Shadow server REST API and Socket.IO real-time events.

## Installation

```bash
pip install shadowob-sdk
```

## Quick Start

```python
from shadowob_sdk import ShadowClient, ShadowSocket

# REST API
client = ShadowClient("https://shadowob.com", token="your-jwt-token")
me = client.get_me()
print(f"Logged in as {me['username']}")

# Send a message
msg = client.send_message("channel-id", "Hello from Python!")
print(f"Sent message: {msg['id']}")

# Real-time events
socket = ShadowSocket("https://shadowob.com", token="your-jwt-token")
socket.on("message:new", lambda msg: print(f"New message: {msg['content']}"))
socket.connect()
socket.join_channel("channel-id")
socket.wait()  # Block until disconnected
```

## API Reference

See the [full documentation](https://shadow-docs.example.com) for complete API reference.
