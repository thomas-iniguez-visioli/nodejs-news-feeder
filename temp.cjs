const net=require("net")
console.log(net)
const bl=new net.BlockList()
bl.addAddress("192.168.0.3")
bl.saveToFile()
console.log(bl)
const fs=require("fs").ex