var Blockwatcher = require('./index.js');

var watcher = new Blockwatcher();

watcher.blockwatch({
  chains:[
    {
      type: "ethereum",
      rpc: 'http://localhost:8545',
      token: '0x91f1dae23760773d46c888b5c97c508ad4fef2fc',
      keys: {
        privateKey: '0x37f434a88197daba1d8862fefebbc9079a69b48348c46a06dd9406e758e27013',
        address: '0x8fcfad0d6f6eee7bff3727a96fdbe5ea10c9d976'
      }
    },
    {
      type: "ethereum",
      rpc: 'http://localhost:8546',
      token: '0xc45c14b747f44e997a5b17657635db0e9699411f',
      keys: {
        privateKey: '0x579493c50f76741a3a30691b8c9670389b9ab7df6a445462a2e5017696f429bd',
        address: '0xc6735454e31c6c4c7bf5bca9e456a8491ec25d11'
      }
    }
  ]
}, (res,n) => {
  var n2 = n == 0 ? 1 : 0;
  var contract = watcher.contracts[n];
  var otherContract = watcher.contracts[n2];
  var rpc = watcher.rpcs[n];

  console.log("-".repeat(80))
  console.log("RPC", rpc, "CHAIN", n)
  console.log("TRANSFER LISTENER CB======================", res)

  var e = res.Transfer.returnValues;

  console.log("TO", e.to);
  console.log('-'.repeat(80))

  if(e.to == '0x0000000000000000000000000000000000000000'){
    console.log("DETECTED BURN ON CHAIN", n, "FROM", e.from, "AMOUNT", e.amount)
    console.log("MINTING TO", e.from, "TARGET", e.from,"CHAIN", n2)

    watcher.docall(watcher.contracts[n2].methods.mint(e.from, e.amount))
  }
});

setTimeout(function(){
  console.log("Burning")
  watcher.docall(watcher.contracts[~~(Math.random()*2)].methods.burn('0xc6735454e31c6c4c7bf5bca9e456a8491ec25d11', ~~(Math.random() * 100)))
}, 5000)

setInterval(()=>{
  console.log('*')
}, 1000)
