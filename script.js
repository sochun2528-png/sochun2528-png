const $ = (selector) => document.querySelector(selector);
const video = $('#camera');
const photoStrip = $('#photoStrip');
const ctx = photoStrip.getContext('2d');
const photos = [];
let stream = null;
let frameColor = '#ffffff';
let shooting = false;

const settings = { width: 900, padding: 48, gap: 24, photoHeight: 430, footer: 210 };

function drawCover(context, image, x, y, width, height, mirror = false) {
  const sourceWidth = image.videoWidth || image.naturalWidth || image.width;
  const sourceHeight = image.videoHeight || image.naturalHeight || image.height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale, drawHeight = sourceHeight * scale;
  const drawX = x + (width - drawWidth) / 2, drawY = y + (height - drawHeight) / 2;
  context.save();
  context.beginPath(); context.rect(x, y, width, height); context.clip();
  if (mirror) { context.translate(x + width, y); context.scale(-1, 1); context.drawImage(image, drawX - x, drawY - y, drawWidth, drawHeight); }
  else context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function renderStrip() {
  const { width, padding, gap, photoHeight, footer } = settings;
  photoStrip.width = width;
  photoStrip.height = padding * 2 + photoHeight * 4 + gap * 3 + footer;
  ctx.fillStyle = frameColor; ctx.fillRect(0, 0, photoStrip.width, photoStrip.height);
  photos.forEach((photo, index) => drawCover(ctx, photo, padding, padding + index * (photoHeight + gap), width - padding * 2, photoHeight));
  for (let index = photos.length; index < 4; index++) {
    const y = padding + index * (photoHeight + gap);
    ctx.fillStyle = '#eae8e5'; ctx.fillRect(padding, y, width - padding * 2, photoHeight);
    ctx.fillStyle = '#b3aea8'; ctx.font = "700 36px Outfit, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText(`${index + 1}`, width / 2, y + photoHeight / 2 + 12);
  }
  const isDark = ['#191919'].includes(frameColor);
  ctx.fillStyle = isDark ? '#ffffff' : '#24233a';
  ctx.font = "800 44px 'Gowun Dodum', sans-serif"; ctx.textAlign = 'center';
  ctx.fillText($('#caption').value.trim() || '오늘의 네컷', width / 2, photoStrip.height - 82);
  ctx.font = "700 22px Outfit, sans-serif"; ctx.letterSpacing = '4px';
  ctx.fillText('FOUR CUTS', width / 2, photoStrip.height - 38);
  $('#downloadButton').disabled = photos.length !== 4;
}

function addPhoto(image) { photos.push(image); renderStrip(); }
function clearPhotos() { photos.splice(0); renderStrip(); }

async function startCamera() {
  try {
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    $('#cameraEmpty').classList.add('hidden');
    $('#startCameraButton').textContent = '카메라 다시 켜기';
    $('#shootButton').disabled = false;
    $('#cameraStatus').textContent = '준비 완료! 버튼을 누르면 10초 후 첫 사진을 촬영합니다.';
  } catch (error) {
    $('#cameraStatus').textContent = '카메라를 사용할 수 없어요. 권한을 확인하거나 사진 업로드를 이용해 주세요.';
  }
}
function stopCamera() { if (stream) stream.getTracks().forEach((track) => track.stop()); stream = null; }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function takeSequence() {
  if (shooting || !stream) return;
  shooting = true; clearPhotos(); $('#shootButton').disabled = true; $('#startCameraButton').disabled = true;
  const counter = $('#countdown'); counter.classList.remove('hidden');
  for (let photoNumber = 1; photoNumber <= 4; photoNumber++) {
    for (let second = 10; second > 0; second--) {
      counter.textContent = second;
      $('#cameraStatus').textContent = `${photoNumber}번째 사진 촬영까지 ${second}초`;
      await wait(1000);
    }
    const snapshot = document.createElement('canvas'); snapshot.width = video.videoWidth; snapshot.height = video.videoHeight;
    drawCover(snapshot.getContext('2d'), video, 0, 0, snapshot.width, snapshot.height, true);
    const image = new Image(); image.src = snapshot.toDataURL('image/jpeg', .92); await image.decode(); addPhoto(image);
    $('#cameraStatus').textContent = `${photoNumber}번째 사진 촬영 완료!`;
    await wait(450);
  }
  counter.classList.add('hidden'); $('#cameraStatus').textContent = '네컷 사진이 완성됐어요. 마음에 들면 저장해 주세요!';
  $('#shootButton').disabled = false; $('#startCameraButton').disabled = false; shooting = false;
}

async function uploadFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/')).slice(0, 4);
  if (images.length !== 4) { $('#uploadStatus').textContent = '정확히 사진 4장을 선택해 주세요.'; return; }
  clearPhotos();
  for (const file of images) { const image = new Image(); image.src = URL.createObjectURL(file); await image.decode(); URL.revokeObjectURL(image.src); addPhoto(image); }
  $('#uploadStatus').textContent = '네컷 사진이 완성됐어요. 아래에서 저장할 수 있어요!';
}

document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.mode-button').forEach((item) => item.classList.toggle('active', item === button));
  const cameraMode = button.dataset.mode === 'camera'; $('#cameraSection').classList.toggle('hidden', !cameraMode); $('#uploadSection').classList.toggle('hidden', cameraMode);
}));
$('#startCameraButton').addEventListener('click', startCamera);
$('#shootButton').addEventListener('click', takeSequence);
$('#fileInput').addEventListener('change', (event) => uploadFiles(event.target.files));
$('.drop-zone').addEventListener('dragover', (event) => { event.preventDefault(); $('.drop-zone').classList.add('dragging'); });
$('.drop-zone').addEventListener('dragleave', () => $('.drop-zone').classList.remove('dragging'));
$('.drop-zone').addEventListener('drop', (event) => { event.preventDefault(); $('.drop-zone').classList.remove('dragging'); uploadFiles(event.dataTransfer.files); });
document.querySelectorAll('.swatch').forEach((button) => button.addEventListener('click', () => { frameColor = button.dataset.color; document.querySelectorAll('.swatch').forEach((item) => item.classList.toggle('selected', item === button)); renderStrip(); }));
$('#caption').addEventListener('input', renderStrip);
$('#downloadButton').addEventListener('click', () => { const link = document.createElement('a'); link.download = 'my-four-cuts.png'; link.href = photoStrip.toDataURL('image/png'); link.click(); });
$('#resetButton').addEventListener('click', () => { clearPhotos(); $('#fileInput').value = ''; $('#uploadStatus').textContent = '사진을 4장 선택해 주세요.'; $('#cameraStatus').textContent = stream ? '다시 촬영할 준비가 됐어요.' : '카메라를 켜고 준비해 주세요.'; });
window.addEventListener('beforeunload', stopCamera);
renderStrip();
