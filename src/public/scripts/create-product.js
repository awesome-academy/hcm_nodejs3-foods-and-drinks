const locale = getCookie('locale');
document.getElementById('image-input').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('image-preview').src = e.target.result;
      document.getElementById('image-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('product-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const file = document.getElementById('image-input').files[0]

  if(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/file', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.url) {
        document.getElementById('image-url').value = result.url;
        event.target.submit();  // Proceed with the form submission
      } else {
        swal.fire({
          title: locale === 'en' ? 'Error' : 'Lỗi',
          text:
            locale === 'en'
              ? 'Error while uploading image. Please try again!'
              : 'Có lỗi xảy ra trong quá trình upload ảnh, hãy thử lại!',
          icon: 'error',
          confirmButtonText: 'OK',
        });
      }
    } catch (error) {
      swal.fire({
        title: locale === 'en' ? 'Error' : 'Lỗi',
        text:
          locale === 'en'
            ? 'Error while uploading image. Please try again!'
            : 'Có lỗi xảy ra trong quá trình upload ảnh, hãy thử lại!',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  } else {
    event.target.submit();
  }
});
