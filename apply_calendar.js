const fs = require('fs');
const path = 'c:/Users/myukf/Desktop/riyou_yoyaku/src/app/staff/calendar/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state for locations
content = content.replace(
  `  const timeOptions = generateTimeOptions();\n  const placeOptions = ["未定", "県米", "自宅", "〇〇小", "家族送迎"];`,
  `  const timeOptions = generateTimeOptions();\n\n  const [pickupLocations, setPickupLocations] = useState<any[]>([]);\n  const [dropoffLocations, setDropoffLocations] = useState<any[]>([]);\n\n  React.useEffect(() => {\n    const pickupData = localStorage.getItem("pico_pickup");\n    if (pickupData) setPickupLocations(JSON.parse(pickupData));\n    else setPickupLocations([{ id: 1, name: "家族送迎", address: "未指定" }, { id: 2, name: "自宅", address: "未指定" }, { id: 3, name: "県立〇〇小学校", address: "未指定" }]);\n\n    const dropoffData = localStorage.getItem("pico_dropoff");\n    if (dropoffData) setDropoffLocations(JSON.parse(dropoffData));\n    else setDropoffLocations([{ id: 1, name: "自宅", address: "未指定" }, { id: 2, name: "祖父母宅", address: "未指定" }]);\n  }, []);`
);

// 2. Refactor initialCalendarDays
content = content.replace(/pickupPlace: "県米"/g, 'pickupPlaceId: 3');
content = content.replace(/pickupPlace: "家族送迎"/g, 'pickupPlaceId: 1');
content = content.replace(/dropoffPlace: "自宅"/g, 'dropoffPlaceId: 1');
content = content.replace(/pickupPlace: "未定"/g, 'pickupPlaceId: null');
content = content.replace(/dropoffPlace: "未定"/g, 'dropoffPlaceId: null');

// 3. Edit Form State
content = content.replace(
  `pickupPlace: "", dropoff: "", dropoffTBD: false, dropoffPlace: ""`,
  `pickupPlaceId: null as number | null, dropoff: "", dropoffTBD: false, dropoffPlaceId: null as number | null`
);

// 4. Update cell rendering display
content = content.replace(
  `<span className={\`text-xs font-medium whitespace-nowrap \${cell.pickupPlace === '未定' ? 'text-gray-400' : 'text-gray-500'}\`}>{cell.pickupPlace}</span>`,
  `{(() => {\n                            const name = pickupLocations.find(l => l.id === cell.pickupPlaceId)?.name;\n                            return <span className={\`text-xs font-medium whitespace-nowrap \${!name ? 'text-gray-400' : 'text-gray-500'}\`}>{name || '未設定'}</span>;\n                          })()}`
);

content = content.replace(
  `<span className={\`text-xs font-medium whitespace-nowrap \${cell.dropoffPlace === '未定' ? 'text-gray-400' : 'text-gray-500'}\`}>{cell.dropoffPlace}</span>`,
  `{(() => {\n                            const name = dropoffLocations.find(l => l.id === cell.dropoffPlaceId)?.name;\n                            return <span className={\`text-xs font-medium whitespace-nowrap \${!name ? 'text-gray-400' : 'text-gray-500'}\`}>{name || '未設定'}</span>;\n                          })()}`
);

// 5. Update edit form initializing when opening the popover
content = content.replace(
  `pickupPlace: cell.pickupPlace || "",\n                                    dropoff: cell.dropoff === "未定" ? timeOptions[0] : (cell.dropoff || ""),\n                                    dropoffTBD: cell.dropoff === "未定",\n                                    dropoffPlace: cell.dropoffPlace || ""`,
  `pickupPlaceId: cell.pickupPlaceId || null,\n                                    dropoff: cell.dropoff === "未定" ? timeOptions[0] : (cell.dropoff || ""),\n                                    dropoffTBD: cell.dropoff === "未定",\n                                    dropoffPlaceId: cell.dropoffPlaceId || null`
);

// 6. Update cell save logic
content = content.replace(
  `pickupPlace: editForm.pickupPlace,\n                            dropoff: editForm.dropoffTBD ? "未定" : editForm.dropoff,\n                            dropoffTBD: editForm.dropoffTBD,\n                            dropoffPlace: editForm.dropoffPlace`,
  `pickupPlaceId: editForm.pickupPlaceId,\n                            dropoff: editForm.dropoffTBD ? "未定" : editForm.dropoff,\n                            dropoffTBD: editForm.dropoffTBD,\n                            dropoffPlaceId: editForm.dropoffPlaceId`
);

content = content.replace(
  `pickupPlace: "県米",\n                            dropoff: "１７:３０",\n                            dropoffTBD: false,\n                            dropoffPlace: "自宅"`,
  `pickupPlaceId: 3,\n                            dropoff: "１７:３０",\n                            dropoffTBD: false,\n                            dropoffPlaceId: 1`
);

// 7. Update Edit Modal Rendering
content = content.replace(
  `onClick={() => setOpenSelect(openSelect === 'pickupPlace' ? null : 'pickupPlace')}\n                  >\n                    {editForm.pickupPlace}\n                  </div>`,
  `onClick={() => setOpenSelect(openSelect === 'pickupPlace' ? null : 'pickupPlace')}\n                  >\n                    {pickupLocations.find(l => l.id === editForm.pickupPlaceId)?.name || '未設定'}\n                  </div>`
);

content = content.replace(
  `{placeOptions.map(p => {\n                          const isSelected = p === editForm.pickupPlace;\n                          return (\n                            <button\n                              key={p}\n                              ref={isSelected ? selectedTimeRef : null}\n                              className={\`w-full text-left px-4 py-2 text-[16px] font-bold hover:bg-[#F2F9F9] transition-colors \${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}\`}\n                              onClick={() => {\n                                setEditForm({...editForm, pickupPlace: p});\n                                setOpenSelect(null);\n                              }}\n                            >\n                              {p}\n                            </button>`,
  `{pickupLocations.map(p => {\n                          const isSelected = p.id === editForm.pickupPlaceId;\n                          return (\n                            <button\n                              key={p.id}\n                              className={\`w-full text-left px-4 py-2 text-[16px] font-bold hover:bg-[#F2F9F9] transition-colors \${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}\`}\n                              onClick={() => {\n                                setEditForm({...editForm, pickupPlaceId: p.id});\n                                setOpenSelect(null);\n                              }}\n                            >\n                              {p.name}\n                            </button>`
);

content = content.replace(
  `onClick={() => setOpenSelect(openSelect === 'dropoffPlace' ? null : 'dropoffPlace')}\n                  >\n                    {editForm.dropoffPlace}\n                  </div>`,
  `onClick={() => setOpenSelect(openSelect === 'dropoffPlace' ? null : 'dropoffPlace')}\n                  >\n                    {dropoffLocations.find(l => l.id === editForm.dropoffPlaceId)?.name || '未設定'}\n                  </div>`
);

content = content.replace(
  `{placeOptions.map(p => {\n                          const isSelected = p === editForm.dropoffPlace;\n                          return (\n                            <button\n                              key={p}\n                              ref={isSelected ? selectedTimeRef : null}\n                              className={\`w-full text-left px-4 py-2 text-[16px] font-bold hover:bg-[#F2F9F9] transition-colors \${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}\`}\n                              onClick={() => {\n                                setEditForm({...editForm, dropoffPlace: p});\n                                setOpenSelect(null);\n                              }}\n                            >\n                              {p}\n                            </button>`,
  `{dropoffLocations.map(p => {\n                          const isSelected = p.id === editForm.dropoffPlaceId;\n                          return (\n                            <button\n                              key={p.id}\n                              className={\`w-full text-left px-4 py-2 text-[16px] font-bold hover:bg-[#F2F9F9] transition-colors \${isSelected ? 'text-[#3DB2D3] bg-[#E8F7FB]' : 'text-gray-800'}\`}\n                              onClick={() => {\n                                setEditForm({...editForm, dropoffPlaceId: p.id});\n                                setOpenSelect(null);\n                              }}\n                            >\n                              {p.name}\n                            </button>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('done');
