# EasyIDB


[![npm package](https://img.shields.io/npm/v/easy-idb)](https://www.npmjs.com/package/easy-idb)
[![dl/week](https://img.shields.io/npm/dw/easy-idb)](https://www.npmjs.com/package/easy-idb)
[![last commit](https://img.shields.io/github/last-commit/Fyfres/EasyIDB)](https://github.com/Fyfres/EasyIDB/commits/master)

Package to use IndexedDB like an SQL DB.


## Installation

To install the stable version:

Using [npm](https://www.npmjs.com/) as your package manager.

```bash
  npm install --save easy-idb
```

Using [yarn](https://yarnpkg.com/en/) as your package manager.

```bash
  yarn add easy-idb
```

## Documentation

### Link to an IndexedDB

To create or use an IndexedDB you just need to instantiate an EasyIDB object. 
It takes two arguments

| Argument | Description |
| --- | --- |
| dbName | String for the name of the IndexedDB |
| maxTimeOut | Integer for the maximum time an operation must take with the IndexedDB. Set to 200ms by default. |

### Create Requests "save"

To Create an Object you just need to send an object using the "save" method on your instantiated EasyIDB.
You can't save an object with same id as another one in your Collection.

| Argument | Description |
| --- | --- |
| collection | String for the name of the collection you want to save your object in. |
| object | Object you want to save, if you don't have an id property it will be set automatically. |

### Update Requests "change"

To Update an Object you just need to send an object with the new values, and the Object id using the "change" method on your instantiated EasyIDB.

| Argument | Description |
| --- | --- |
| collection | String for the name of the collection you want to update your object in. |
| objectWithUpdatedFields | Object with only the properties to update. |
| id | Integer the id of the Object you want to update. |

### Relation between Collections

If you modify or create a new Object in the relation, it will automatically be inserted or updated in the corresponding Collection.

#### OneToMany "fk_linkedCollectionName"

To create this relation, in the object you save or update you need to add the property "fk_linkedCollectionName" with the object in the second Collection the object needs to be linked to as the value.  

#### ManyToMany "fks_linkedCollectionName"

To create this relation, in the object you save or update you need to add the property "fks_linkedCollectionName" with the array of objects in the second Collection the object needs to be linked to as the value.  


### Delete Requests "remove"

To Delete an Object you just need to send your object Id using the "remove" method on your instantiated EasyIDB.

| Argument | Description |
| --- | --- |
| collection | String for the name of the collection you want to delete your object in. |
| id | Integer the id of the Object you want to delete. |

### Read Requests

#### getAll

Method from your instantiated EasyIDB that return all Objects in a Collection.
The results can be limited or ordered.

| Argument | Description |
| --- | --- |
| collection | String for the name of the collection you want to your objects from. |
| option | Object with the properties "limit" that tells how many item you want at max (set to 99999 by default), "orderBy" is a String to tell the name of the field by with your result will be ordered, and "orderDir" that can be "asc" or "desc" (not case sensitive) to tell how you want to order you results.  |


#### getById

Method from your instantiated EasyIDB that return an Object selected by an Id in a Collection.

| Argument | Description |
| --- | --- |
| collection | String for the name of the collection you want to your objects from. |
| id | Integer the id of the Object you want to get. |

#### getBy

Method from your instantiated EasyIDB that return the first Object corresponding to some criteria in a Collection.
The result ordered.

| Argument | Description |
| --- | --- |
| collection | String for the name of the collection you want to your objects from. |
| search | Object with the properties to search and the value they must be equal to. |
| option | Object with the properties "orderBy" is a String to tell the name of the field by with your result will be ordered, and "orderDir" that can be "asc" or "desc" (not case sensitive) to tell how you want to order you results.  |
