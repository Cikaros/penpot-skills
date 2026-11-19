// V-06: temporary page lifecycle probe. WRITES a page and removes it.
// Run only on a disposable file/page context.
const original = penpot.currentPage;
const page = penpot.createPage();
page.name = "probe-page-" + Date.now();

try {
  await penpot.openPage(page);
  const opened = { id: page.id, name: page.name, isCurrent: penpot.currentPage.id === page.id };

  await penpot.openPage(original);
  const restored = penpot.currentPage.id === original.id;
  page.remove();

  return {
    probeId: "V-06",
    opened,
    restored,
    removed: !penpotUtils.getPages().some((item) => item.id === page.id),
    currentPage: penpot.currentPage ? penpot.currentPage.name : null
  };
} catch (e) {
  try {
    if (penpot.currentPage.id !== original.id) await penpot.openPage(original);
  } catch {}
  try {
    if (penpotUtils.getPages().some((item) => item.id === page.id)) page.remove();
  } catch {}
  return { probeId: "V-06", error: String(e && e.message ? e.message : e) };
}
