const qrLink = document.querySelector('.footer-qr');
const copyStatus = document.getElementById('qr-copy-status');
let clearStatus;

qrLink?.addEventListener('click', async (event) => {
  // 수정키 클릭과 우클릭은 일반 링크처럼 사용할 수 있게 둔다.
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  clearTimeout(clearStatus);
  copyStatus.textContent = '';

  try {
    await navigator.clipboard.writeText(qrLink.href);
    copyStatus.textContent = '주소를 복사했습니다.';
    clearStatus = setTimeout(() => { copyStatus.textContent = ''; }, 3000);
  } catch {
    copyStatus.textContent = '복사하지 못했습니다. QR을 우클릭해 링크 주소를 복사해 주세요.';
  }
});
