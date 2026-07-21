/*
  FILE: upload.js

  What does this file do?
  It handles uploading photos and documents (e.g. a space's photos, or
  a national ID when becoming a WSpacer+) to an external service called
  Cloudinary, which acts as a free "storage" for images on the internet.
  Once the photo is uploaded there, Cloudinary gives us back a link
  (a web address), which is what we store in our database instead of
  storing the whole photo.

  BEFORE USING THIS FOR REAL, 3 steps are needed:
  1. Create a free account at https://cloudinary.com
  2. Inside the Cloudinary dashboard, go to Settings > Upload and create
     an "Upload preset" in "Unsigned" mode (this lets the page upload
     files without needing to embed secret passwords here)
  3. Replace the two values below (CLOUDINARY_CLOUD_NAME and
     CLOUDINARY_UPLOAD_PRESET) with that account's real values
*/

const CLOUDINARY_CLOUD_NAME = 'b7luvb20';
const CLOUDINARY_UPLOAD_PRESET = 'wspace_uploads';

// Takes a file (a photo or a document) and uploads it to Cloudinary.
// When it's done, returns the link where that file ended up stored
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    throw new Error('No se pudo subir el archivo');
  }

  const data = await response.json();
  return data.secure_url;
}

// Connects a form's "choose file" input to the Cloudinary upload. Every
// time the user picks one or more files, this function uploads them
// automatically one by one and reports back each one as it's ready
// (via "onFileUploaded")
function attachFileUploader(inputElement, onFileUploaded) {
  inputElement.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);

    for (const file of files) {
      try {
        showToast(`Subiendo ${file.name}...`);
        const url = await uploadFile(file);
        onFileUploaded(url, file.name);
      } catch (error) {
        showToast(`No se pudo subir ${file.name}`);
      }
    }
  });
}
