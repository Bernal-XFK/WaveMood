const { NotionAPI } = require('notion-client');
const api = new NotionAPI();

async function main() {
  try {
    const pageId = '44df6b1f0cc34a2da54f33fa5ecd39a4';
    const recordMap = await api.getPage(pageId);
    
    // Extract collection data
    const collectionQuery = recordMap.collection_query;
    const block = recordMap.block;
    const collection = recordMap.collection;
    
    // Find the collection ID
    const collectionId = Object.keys(collection)[0];
    const coll = collection[collectionId].value;
    
    // Find the schema
    const schema = coll.schema;
    
    // Find the rows
    const rows = [];
    for (const blockId in block) {
      const b = block[blockId].value;
      if (b && b.type === 'page' && b.parent_id === collectionId) {
        const row = {};
        if (b.properties) {
          for (const propId in b.properties) {
            const propName = schema[propId].name;
            const propValue = b.properties[propId][0][0];
            row[propName] = propValue;
          }
        }
        rows.push(row);
      }
    }
    
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
