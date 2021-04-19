import Localbase from "localbase";
import {v4 as uuid} from "uuid";

export default class EasyIDB extends Localbase {
    constructor(dbName, maxTimeOut = 200) {
        super(dbName);
        this.maxTimeOut = maxTimeOut;
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
        return new Promise((resolve, reject)=>{
            let i = 0;
            let timeOut = this.maxTimeOut/2;
            for (const [key, value] of Object.entries(response)) {
                if(key.startsWith("fk_")){
                    i++;
                    this.getById(key.split("fk_")[1], value).then(idResp => {
                        i--;
                        response[key] = idResp;
                    }).catch(e=>reject(e))
                }
                if(key.startsWith("fks_")) {
                    value.forEach((fk, index) => {
                        i++;
                        this.getById(key.split("fks_")[1], fk).then(idResp => {
                            i--;
                            response[key][index] = idResp
                        }).catch(e=>reject(e))
                    })
                }
            }
            const inter = setInterval(()=>{
                if(i === 0) {
                    window.clearInterval(inter);
                    resolve(response);
                }
                if(timeOut === 0) {
                    reject("TimeOut Request took to much time to operate")
                }
                timeOut--;
            },2)

        })
    }



    #replaceObjectOfFkById = (response) => {
        return new Promise((resolve, reject) => {
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

            let i = 0;
            let timeOut = this.maxTimeOut/2;
            for (const [key, value] of Object.entries(response)) {
                if(key.startsWith("fk_") && (typeof value) === "object"){
                    i++;
                    saveOrUpdate(value,key.split("fk_")[1]).then((id)=>{
                        response[key] = id;
                        i--;
                    }).catch(e=>{reject(e)})
                }
                if(key.startsWith("fks_")) {
                    value.forEach((fk,index) => {
                        if((typeof fk) === "object") {
                            i++;
                            saveOrUpdate(fk,key.split("fks_")[1]).then((id)=>{
                                response[key][index] = id;
                                i--;
                            }).catch(e=>{reject(e)})
                        }
                    })
                }
            }

            const inter = setInterval(()=>{
                if(i === 0) {
                    window.clearInterval(inter);
                    resolve(response);
                }
                if(timeOut === 0) {
                    reject("TimeOut Request took to much time to operate")
                }
                timeOut--;
            },2)
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
            await this.#createGetRequestWithParams(collection,{limit,orderBy,orderDir}).get().then((responses) => {
                let i = 0;
                let timeOut = this.maxTimeOut/2;
                responses.forEach(async (response, i) => {
                    i++;
                    this.#replaceIdOfFkByObject(response).then(resp=>{
                        i--;
                        response = resp;
                    })
                })
                const inter = setInterval(()=>{
                    if(timeOut === 0) {
                        reject("TimeOut Request took to much time to operate")
                    }
                    timeOut--;
                    if(i === 0) {
                        window.clearInterval(inter);
                        resolve(responses);
                    }
                },2)
            }).catch((e)=>{
                reject(e)
            })
        })
    }

    getBy = (collection, search, {limit,orderBy,orderDir} = {limit:99999,orderBy:undefined,orderDir:undefined}) => {
        return new Promise(async (resolve, reject) => {
            await this.#createGetRequestWithParams(collection,{limit,orderBy,orderDir}).doc(search).get().then((response) => {
                this.#replaceIdOfFkByObject(response).then(resp=>{
                    resolve(resp);
                }).catch((e)=> {
                    reject(e);
                })
            }).catch((e)=>{
                reject(e)
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