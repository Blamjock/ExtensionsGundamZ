const tableBody = document.getElementById('table-body');

chrome.storage.local.get('gundamMapping', (data) => {
  const mapping = data.gundamMapping || {};
  for (const [setID, config] of Object.entries(mapping)) {
    addTableRow(setID, config);
  }
});

function addTableRow(setID = '', config = {units:[0,0], pilots:[0,0], commands:[0,0], bases:[0,0]}) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="set-id" value="${setID}" placeholder="GD04"></td>
    <td><input type="number" class="u-s" value="${config.units[0]}">-<input type="number" class="u-e" value="${config.units[1]}"></td>
    <td><input type="number" class="p-s" value="${config.pilots[0]}">-<input type="number" class="p-e" value="${config.pilots[1]}"></td>
    <td><input type="number" class="c-s" value="${config.commands[0]}">-<input type="number" class="c-e" value="${config.commands[1]}"></td>
    <td><input type="number" class="b-s" value="${config.bases[0]}">-<input type="number" class="b-e" value="${config.bases[1]}"></td>
    <td><button class="delete-btn">×</button></td>
  `;
  row.querySelector('.delete-btn').onclick = () => row.remove();
  tableBody.appendChild(row);
}

document.getElementById('add-set').onclick = () => addTableRow();
document.getElementById('save-settings').onclick = () => {
  const mapping = {};
  tableBody.querySelectorAll('tr').forEach(tr => {
    const id = tr.querySelector('.set-id').value.toUpperCase();
    if(id) mapping[id] = {
      units: [parseInt(tr.querySelector('.u-s').value), parseInt(tr.querySelector('.u-e').value)],
      pilots: [parseInt(tr.querySelector('.p-s').value), parseInt(tr.querySelector('.p-e').value)],
      commands: [parseInt(tr.querySelector('.c-s').value), parseInt(tr.querySelector('.c-e').value)],
      bases: [parseInt(tr.querySelector('.b-s').value), parseInt(tr.querySelector('.b-e').value)]
    };
  });
  chrome.storage.local.set({ gundamMapping: mapping }, () => alert("Salvato!"));
};