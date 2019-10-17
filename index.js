var Web3 = require('web3');
const cote = require('cote');

class Blockwatcher{
  constructor(){
    this.config = {};
    this.rpcs = [];//['http://localhost:8545','http://localhost:8546']; //, 'http://localhost:8546'
    this.token_addresses = [];//['0x91f1dae23760773d46c888b5c97c508ad4fef2fc','0xc45c14b747f44e997a5b17657635db0e9699411f'];

    this.webs = [];
    this.contracts = [];

    this.subscribers = [];
    this.publishers = [];
  }

  init(){
    this.webs = this.rpcs.map(x => new Web3(new Web3.providers.HttpProvider(x)));

    for(var i=0; i<this.webs.length; i++){
      this.addaccount(this.webs[i], i)
    }

    var abi = [
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "constant": false,
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "burn",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "mint",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]

    this.contracts = this.webs.map((web3,n) => new web3.eth.Contract(abi, this.token_addresses[n]))
  }

  docall(call){
    //console.log("CALL",call)
    var host = call._parent._provider.host;
    var n = this.rpcs.indexOf(host);
    var that = this;

    call.estimateGas().then(function(gasEst){
      //console.log("GAS EST", gasEst)
                    //"0x8fcfad0d6f6eee7bff3727a96fdbe5ea10c9d976"
      call.send({from:that.config.chains[n].keys.address, gas:gasEst, gasPrice:'0'})
      .then(function(res){
        //console.log("EMITTING EVENTS", res)

        res.events.host = host;
        res.events.n = n;

        console.log("HOST INDEX", n)
        that.publishers[n].publish('Events', res.events);
      })
    })
  }

  subevents(n, cb){
    var contract = this.contracts[n];

    contract.events.allEvents({fromBlock: 0}, function(res){
      cb(res,n)
    })
  }

  subglobal(web3){
    web3.eth.subscribe('newBlockHeaders', function (error, blockHeader) {
      if (error) console.log("BLOCK HEADER ERR", error)
      console.log(blockHeader)
    })
    .on('data', function (blockHeader) {
      // alternatively we can log it here
      console.log("BLOCK", blockHeader)
    })
  }

  addaccount(web3, n){
    var acct = web3.eth.accounts.wallet.add(this.config.chains[n].keys.privateKey);
    console.log("account", acct)
  }

  async coteevents(n){
    var web3 = this.webs[n];
    var contract = this.contracts[n];

    const subscriber = this.subscribers[n] = new cote.Subscriber({name: 'EventSubscriber'+n, subscribesTo: ['Events'] });
    const publisher = this.publishers[n] = new cote.Publisher({name: 'EventPublisher'+n,broadcasts: ['Events']});
    //override event handler subscriber funcs
    Object.keys(contract.events).forEach(eventName => {
      contract.events[eventName] = function(filter, cb){
        subscriber.on('Events', (req) => {
            //console.log('notified of ', req);
            if(req.n == n) cb(req);
        });
      }
    })

    Object.keys(contract.methods).forEach(name => {
      console.log("METHOD NAME", name)
      //contract.methods[name].docall = (me) => {this.docall(me)}
    })

    console.log("EVENTS KEYS", Object.keys(contract.events))
  }

  async setuprpc(n, cb){
    this.coteevents(n);
    this.subevents(n, cb)
  }

  blockwatch(config, cb){
    this.config = config;
    this.rpcs = config.chains.map(x => x.rpc);
    this.token_addresses = config.chains.map(x => x.token);

    this.init();

    this.rpcs.forEach(async (rpc,n) => this.setuprpc(n, cb));
  }

}

////////////////////////////////////////////////////////////////////////////////

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
