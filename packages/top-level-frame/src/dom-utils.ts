export const toggleVisibleDOMSection = (selectedSectionId?: string) => {
  console.log('toggleVisibleDOMSection', selectedSectionId);
  // rehide all sections
  document.querySelectorAll('.section').forEach(section => {
    (section as any).style.display = 'none';
  });
  // show newly selected section
  if (selectedSectionId) {
    (document.getElementById(selectedSectionId) as any).style.display = 'block';
  }
}

export const replaceChildrenWithText = (element: HTMLElement | null, text:string) => {
  if (element) {
    element.textContent = text;
  }
}
