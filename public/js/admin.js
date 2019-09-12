const deleteProduct = (btn) => {
  const prodId = btn.parentNode.querySelector('[name=productID]').value;
  const csrfToken = btn.parentNode.querySelector('[name=_csrf]').value;
  const productElement = btn.closest('article'); // Sélectionne dans la page html l'élément le plus proche
  fetch(`/admin/product/${prodId}`, {            // parmi les ancêtres qui correspond au sélecteur.
    method: 'DELETE',
    headers: {
      'csrf-token': csrfToken
    }
  })
  .then(result => {
    return result.json();
  })
  .then(data => {
    console.log(data);
    productElement.remove();
  })
  .catch(err => console/log(err));
};
