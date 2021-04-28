import Localbase from "localbase";
import {v4 as uuid} from "uuid";

export default class EasyIDB extends Localbase {
    constructor(dbName) {
        super(dbName);
        this.config.debug = false;
    }

    #createGetRequestWithParams = (collection,{limit,orderBy,orderDir}) => {
        let request = this.collection(collection);
        if(limit) {
            request = request.limit(limit);
        }
        if(orderBy) {
            request = orderDir && (orderDir.toLowerCase() === "asc" || orderDir.toLowerCase() === "desc") ? request.orderBy(orderBy, orderDir.toLowerCase()) : request.orderBy(orderBy);
        }
        return request
    }

    #replaceIdOfFkByObject = (response) => {
        return new Promise(async(resolve, reject)=>{
            await Promise.all(Object.entries(response).map(async ([key, value])=>{
                if(key.startsWith("fk_")){
                    await this.getById(key.split("fk_")[1], value).then(idResp => {
                        response[key] = idResp;
                        return response
                    }).catch(e=>reject(e))
                }
                if(key.startsWith("fks_")) {
                    for (const fk of value) {
                        let index = value.indexOf(fk);
                        await this.getById(key.split("fks_")[1], fk).then(idResp => {
                            response[key][index] = idResp
                        }).catch(e=>reject(e))
                    }
                    return response;
                }
            }))
            resolve(response);
        })
    }



    #replaceObjectOfFkById = (response) => {
        return new Promise(async (resolve, reject) => {
            const saveOrUpdate = (objectToSaveOrUpdate, collection) => {
                return new Promise((resolve1, reject1) => {
                    this.#objectExist(collection,objectToSaveOrUpdate.id).then(exist =>{
                        if(exist){
                            this.#replaceObjectOfFkById(objectToSaveOrUpdate).then(newObjectToSaveOrUpdate => {
                                this.change(collection, newObjectToSaveOrUpdate, objectToSaveOrUpdate.id).then(() => {
                                    resolve1(objectToSaveOrUpdate.id);
                                }).catch(e => reject1(e))
                            })
                        } else {
                            this.#replaceObjectOfFkById(objectToSaveOrUpdate).then(newObjectToSaveOrUpdate => {
                                if(objectToSaveOrUpdate.id) {
                                    this.save(collection, newObjectToSaveOrUpdate, objectToSaveOrUpdate.id).then((id) => {
                                        resolve1(id);
                                    }).catch(e => reject1(e))
                                } else {
                                    this.save(collection, newObjectToSaveOrUpdate).then((id) => {
                                        resolve1(id);
                                    }).catch(e => reject1(e))
                                }
                            })
                        }
                    })
                })
            }

            await Promise.all(Object.entries(response).map(async([key,value]) => {
                if(key.startsWith("fk_") && (typeof value) === "object"){
                    await saveOrUpdate(value,key.split("fk_")[1]).then((id)=>{
                        response[key] = id;
                        return response;
                    }).catch(e=>{reject(e)})
                }
                if(key.startsWith("fks_")) {
                    for (const fk of value) {
                        let index = value.indexOf(fk);
                        if((typeof fk) === "object") {
                            await saveOrUpdate(fk,key.split("fks_")[1]).then((id)=>{
                                response[key][index] = id;
                            }).catch(e=>{reject(e)})
                        }
                    }
                    return response;
                }
                return response;
            }))
            resolve(response);
        })
    }


    #objectExist = (collection,id) => {
        return new Promise(((resolve, reject) => {
            this.getById(collection,id).then(objById => {
                resolve(objById ? true : false);
            }).catch(e => reject(e))
        }))
    }








    getAll = (collection, {limit,orderBy,orderDir} = {limit:99999,orderBy:undefined,orderDir:undefined}) => {
        return new Promise(async (resolve, reject) => {
            await this.#createGetRequestWithParams(collection,{limit,orderBy,orderDir}).get().then(async (responses) => {
                await Promise.all(responses.map(async (response) => {
                    return await this.#replaceIdOfFkByObject(response)
                }))
                resolve(responses);
            }).catch((e)=>{
                reject(e)
            })
        })
    }

    getBy = (collection, search, {limit,orderBy,orderDir} = {limit:99999,orderBy:undefined,orderDir:undefined}) => {
        return new Promise(async (resolve, reject) => {
            await this.getAll(collection, {}).then(results => {
                results = results.filter(item => {
                    for (const key in search) {
                        if(search[key].comparator && search[key].comparator !== "=") {
                            if(item.hasOwnProperty(key)){
                                if(search[key].comparator === "contain" && !item[key].includes(search[key].value)) return false;
                                if(search[key].comparator === "start" && !item[key].startsWith(search[key].value)) return false;
                                if(search[key].comparator === "end" && !item[key].endsWith(search[key].value)) return false;
                                if(search[key].comparator === "!=" && item[key] === search[key].value) return false;
                                if(search[key].comparator === "<" && item[key] >= search[key].value) return false;
                                if(search[key].comparator === "<=" && item[key] > search[key].value) return false;
                                if(search[key].comparator === ">" && item[key] <= search[key].value) return false;
                                if(search[key].comparator === ">=" && item[key] < search[key].value) return false;
                                if(["contain","start","end","!=","<","<=",">",">="].indexOf(search[key].comparator) === -1) reject("The comparator \"" + search[key].comparator + "\" used on the field \"" + key + "\" isn't supported.");
                            } else {
                                return false;
                            }
                        } else {
                            if(search[key].value !== item[key]) {
                                return false;
                            }
                        }
                    }
                    return true;
                })
                if(orderBy){
                    results = results.sort((a,b) => {
                        return a[orderBy].toString().localeCompare(b[orderBy].toString())
                    })
                    if(orderDir.toLowerCase() === "desc") results = results.reverse();
                }
                if(limit)  results = results.splice(0,limit);
                resolve(results);
            })

        })
    }

    getById = (collection, id) => {
        return new Promise((resolve, reject) => {
            this.#createGetRequestWithParams(collection,{limit:1,orderBy:undefined,orderDir:undefined}).doc({id}).get().then((response) => {
                if(response) {
                    this.#replaceIdOfFkByObject(response).then(resp=>{
                        resolve(resp);
                    })
                } else {
                    resolve(response)
                }

            }).catch((e)=>{
                reject(e)
            })
        })
    }

    save = (collection, object) => {
        return new Promise ((resolve,reject) => {
            this.#objectExist(collection, object.id).then((exist)=>{
                if(!object.hasOwnProperty("id")) {
                    object.id = uuid();
                }
                if(!exist) {
                    this.#replaceObjectOfFkById(object).then((newObject) => {
                        this.collection(collection).add(newObject).then(() => {
                            resolve(object.id);
                        }).catch(e=>reject(e))
                    }).catch(e=>reject(e))
                } else {
                    reject(console.error("Your object ID Already exist in the Database"))
                }
            }).catch(e=>reject(e))
        })
    }

    change = (collection, objectWithUpdatedFields, id) => {
        return new Promise ((resolve,reject) => {
            this.#objectExist(collection, id).then((exist)=>{
                if(exist) {
                    this.#replaceObjectOfFkById(objectWithUpdatedFields).then(newObjectWithUpdatedFields => {
                        this.collection(collection).doc({ id: id }).update(newObjectWithUpdatedFields).then((resp)=>{
                            resolve(resp);
                        }).catch(e=>reject(e))
                    }).catch(e=>reject(e))
                } else {
                    reject(console.error("Your object ID doesn't exist in the Database"))
                }
            })
        })
    }

    remove = (collection, id) => {
        return this.collection(collection).doc({ id: id }).delete()
    }
}