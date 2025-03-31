document.addEventListener("DOMContentLoaded", function () {
  // Initialize Three.js scene
  const canvas = document.getElementById("heart-canvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  const cameraBox = document.querySelector(".camera-box");
  canvas.width = cameraBox.clientWidth;
  canvas.height = cameraBox.clientHeight;

  const scene = new THREE.Scene();
  scene.background = null; // Transparent background for overlay
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // Enable transparency
    antialias: true,
  });
  renderer.setSize(canvas.width, canvas.height);

  // Enhanced lighting
  const ambientLight = new THREE.AmbientLight(0xd4af37, 0.8);
  scene.add(ambientLight);
  const pointLight1 = new THREE.PointLight(0xd4af37, 1.5);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);
  const pointLight2 = new THREE.PointLight(0xd4af37, 1.5);
  pointLight2.position.set(-5, -5, -5);
  scene.add(pointLight2);

  // Load heart model
  const loader = new THREE.GLTFLoader();
  let heartModel;
  let beatSpeed = 1;

  loader.load(
    "https://raw.githubusercontent.com/36villages/heart-model/main/realistic_human_heart.glb",
    (gltf) => {
      heartModel = gltf.scene;
      scene.add(heartModel);

      const box = new THREE.Box3().setFromObject(heartModel);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      heartModel.position.set(-center.x, -center.y, -center.z);
      const desiredSize = 1.5;
      const scale = desiredSize / size;
      heartModel.scale.set(scale, scale, scale);
      camera.position.z = size * 1.5;

      heartModel.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhongMaterial({
            color: 0xd4af37,
            shininess: 100,
            specular: 0x111111,
            transparent: true,
            opacity: 0.9,
          });
        }
      });

      function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.001 * beatSpeed;
        heartModel.scale.set(
          scale + Math.sin(time) * 0.08,
          scale + Math.sin(time) * 0.08,
          scale + Math.sin(time) * 0.08
        );
        heartModel.rotation.y += 0.01;
        renderer.render(scene, camera);
      }
      animate();
    },
    (xhr) =>
      console.log("Loading progress:", (xhr.loaded / xhr.total) * 100 + "%"),
    (error) => console.error("Error loading .glb:", error)
  );

  // Initialize stats
  const chatBox = document.getElementById("chat-box");
  const currentSubs = document.getElementById("current-subs");
  const newSubs = document.getElementById("new-subs");
  const latestDonation = document.getElementById("latest-donation");
  const raids = document.getElementById("raids");
  const explosion = document.getElementById("explosion");

  let subCount = 0;
  let newSubCount = 0;
  let raidCount = 0;

  // StreamElements WebSocket connection
  const socket = io("https://realtime.streamelements.com", {
    transports: ["websocket"],
  });

  // Replace with your actual JWT token from StreamElements
  const jwtToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjaXRhZGVsIiwiZXhwIjoxNzU4OTMzNzk4LCJqdGkiOiJhOWZlZThhNy00NjM4LTRlMWItYTc2Ny1lMzBlZDVkNzY2OGMiLCJjaGFubmVsIjoiNjdlOWU1MjY1YWI3MTRmODAyNDM2Y2JkIiwicm9sZSI6Im93bmVyIiwiYXV0aFRva2VuIjoiV3c1RWVCY0cwWVBsc2pXNV9IbW1id2F1Wi0zWVJsTmFrZTJVd0J3Ry1mN2IwdGVTIiwidXNlciI6IjY3ZTllNTI2NWFiNzE0ZjgwMjQzNmNiYyIsInVzZXJfaWQiOiJmZDNlOTQ2ZS1jZDg3LTQ2NjQtYWVkZi1kM2UzNDc2ZDM4NTQiLCJ1c2VyX3JvbGUiOiJjcmVhdG9yIiwicHJvdmlkZXIiOiJ0d2l0Y2giLCJwcm92aWRlcl9pZCI6IjcwNTkwOTU5OSIsImNoYW5uZWxfaWQiOiIzZjZhYTU1MC0wYzg3LTQ1ZGYtYTMwNS05N2ZhZTM4YmZjYTMiLCJjcmVhdG9yX2lkIjoiMDg0NzFkZWYtZjI0YS00ZWY5LWI5MTgtMGQ4MGFiMGIyYmZiIn0.5yQ7kZ4ymNAV-HgBBN6P7ftzUme_pyU8gZ6XROGmNFw"; // Replace this with your JWT token

  socket.on("connect", () => {
    console.log("Connected to StreamElements WebSocket");
    socket.emit("authenticate", {
      method: "jwt",
      token: jwtToken,
    });
  });

  socket.on("authenticated", (data) => {
    console.log("Successfully authenticated with StreamElements:", data);
  });

  socket.on("unauthorized", (error) => {
    console.error("Authentication failed:", error);
    alert("Failed to authenticate with StreamElements. Check your JWT token.");
  });

  socket.on("event", (data) => {
    console.log("StreamElements event received:", data);
    handleEvent(data);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from StreamElements WebSocket");
  });

  function handleEvent(eventData) {
    if (!eventData || !eventData.type) return;

    switch (eventData.type) {
      case "subscriber":
        handleSubscriber(eventData);
        break;
      case "follow":
        handleFollow(eventData);
        break;
      case "donation":
        handleDonation(eventData);
        break;
      case "raid":
        handleRaid(eventData);
        break;
      case "host":
        handleHost(eventData);
        break;
      default:
        console.log("Unhandled event type:", eventData.type);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function handleSubscriber(eventData) {
    if (heartModel) {
      heartModel.traverse((child) => {
        if (child.isMesh) child.material.color.set(0xffd700);
      });
      setTimeout(() => {
        heartModel.traverse((child) => {
          if (child.isMesh) child.material.color.set(0xd4af37);
        });
      }, 5000);
    }
    subCount++;
    newSubCount++;
    currentSubs.textContent = `Current Subscribers: ${subCount}`;
    newSubs.textContent = `New Subscribers: ${newSubCount}`;
    const message = eventData.data.bulkGifted
      ? `${eventData.data.sender} gifted ${eventData.data.amount} subs!`
      : `${eventData.data.name} subscribed!`;
    chatBox.innerHTML += `<p class="neon-text">${message}</p>`;
  }

  function handleFollow(eventData) {
    beatSpeed = 2;
    setTimeout(() => (beatSpeed = 1), 5000);
    chatBox.innerHTML += `<p class="neon-text">${eventData.data.name} followed!</p>`;
  }

  function handleDonation(eventData) {
    explosion.classList.add("active");
    setTimeout(() => explosion.classList.remove("active"), 1000);
    latestDonation.textContent = `Latest Donation: ${eventData.data.name} - $${eventData.data.amount}`;
    chatBox.innerHTML += `<p class="neon-text">${
      eventData.data.name
    } donated $${eventData.data.amount}: ${eventData.data.message || ""}</p>`;
  }

  function handleRaid(eventData) {
    raidCount++;
    raids.textContent = `Raids: ${raidCount}`;
    chatBox.innerHTML += `<p class="neon-text">${eventData.data.name} raided with ${eventData.data.amount} viewers!</p>`;
  }

  function handleHost(eventData) {
    chatBox.innerHTML += `<p class="neon-text">${eventData.data.name} hosted with ${eventData.data.amount} viewers!</p>`;
  }

  window.addEventListener("resize", () => {
    canvas.width = cameraBox.clientWidth;
    canvas.height = cameraBox.clientHeight;
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.width, canvas.height);
  });
});
