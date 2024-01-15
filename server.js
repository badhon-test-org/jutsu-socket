import { Server } from "socket.io";
import * as http from "http";
import { ChangeSet, Text } from "@codemirror/state";

const server = http.createServer();

const documents = new Map();
documents.set("", {
  updates: [],
  pending: [],
  doc: Text.of(["\n\n\nStarting doc!\n\n\n"]),
});

const io = new Server(server, {
  path: "/api",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

function getDocument(name) {
  if (documents.has(name)) return documents.get(name);

  const documentContent = {
    updates: [],
    pending: [],
    doc: Text.of([`\nreturn ( \n   <h1>Hello World from ${name}</h1> \n)\n`]),
  };

  documents.set(name, documentContent);

  return documentContent;
}

const participants = [];

const broadcastParticipants = (socket, isJoining) => {
  const participantUsernames = [
    ...new Set(
      participants.map((participant) => {
        return {
          userName: participant.username,
          userId: participant.userId,
          documentName: participant.documentName,
        };
      })
    ),
  ];

  io.emit("participantsList", participantUsernames);

  if (isJoining) {
    console.log("New user joined!");
    io.emit("userJoined", { username: socket.username, userId: socket.userId });
  } else {
    console.log("User left!");
    io.emit("userLeft", { username: socket.username, userId: socket.userId });
  }
};

io.on("connection", (socket) => {
  socket.on("pullUpdates", (documentName, version) => {
    try {
      const { updates, pending, doc } = getDocument(documentName);

      if (version < updates.length) {
        socket.emit(
          "pullUpdateResponse",
          JSON.stringify(updates.slice(version))
        );
      } else {
        pending.push((updates) => {
          socket.emit(
            "pullUpdateResponse",
            JSON.stringify(updates.slice(version))
          );
        });
        documents.set(documentName, { updates, pending, doc });
      }
    } catch (error) {
      console.error("pullUpdates", error);
    }
  });

  socket.on("pushUpdates", (documentName, version, docUpdates) => {
    try {
      let { updates, pending, doc } = getDocument(documentName);
      docUpdates = JSON.parse(docUpdates);

      if (version != updates.length) {
        socket.emit("pushUpdateResponse", false);
      } else {
        for (let update of docUpdates) {
          // Convert the JSON representation to an actual ChangeSet
          // instance
          let changes = ChangeSet.fromJSON(update.changes);
          updates.push({
            changes,
            clientID: update.clientID,
            effects: update.effects,
          });
          documents.set(documentName, { updates, pending, doc });
          doc = changes.apply(doc);
          documents.set(documentName, { updates, pending, doc });
        }
        socket.emit("pushUpdateResponse", true);

        while (pending.length) pending.pop()(updates);
        documents.set(documentName, { updates, pending, doc });
      }
    } catch (error) {
      console.error("pushUpdates", error);
    }
  });

  socket.on("getDocument", (documentName) => {
    try {
      let { updates, doc } = getDocument(documentName);

      socket.emit("getDocumentResponse", updates.length, doc.toString());
    } catch (error) {
      console.error("getDocument", error);
    }
  });

  socket.on("edit", (params) => {
    socket.emit("display", params);
  });

  socket.on("join", (username, documentName) => {
    // @ts-ignore
    socket.username = username;
    // @ts-ignore
    socket.userId = socket.id;
    participants.push({ socket, username, userId: socket.id, documentName });
    broadcastParticipants(socket, true);
  });

  socket.on("participantsList", () => {
    console.log("participantsList", participants);
    // const participantUsernames = participants.map(participant => participant.username);
    socket.emit("participantsList", participants);
  });

  // Handle disconnect to remove participants from the list
  socket.on("disconnect", () => {
    const index = participants.findIndex((p) => p.socket === socket);
    if (index !== -1) {
      participants.splice(index, 1);
      broadcastParticipants(socket, false);
    }
  });
});

const port = process.env.PORT || 8888;
server.listen(port, () => console.log(`Server listening on port: ${port}`));
