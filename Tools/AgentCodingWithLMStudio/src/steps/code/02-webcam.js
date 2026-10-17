// 1. Un élément <video> invisible reçoit le flux de la webcam
const video = document.createElement('video');
video.muted = true;
video.playsInline = true;

// 2. On demande l'accès à la caméra, puis on lance la boucle d'animation
navigator.mediaDevices
  .getUserMedia({ video: { width: 1280, height: 720 } })
  .then((stream) => {
    video.srcObject = stream;
    return video.play();
  })
  .then(() => requestAnimationFrame(loop));

// 3. Dessine l'image de la caméra en couvrant tout le canvas
function drawVideo() {
  const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1); // effet miroir horizontal
  ctx.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  ctx.restore();
}

// 4. Ce que l'on dessine à chaque image (cette fonction va évoluer)
function draw() {
  drawVideo();
}

// 5. La boucle d'animation : environ 60 images par seconde
function loop() {
  draw();
  requestAnimationFrame(loop);
}
