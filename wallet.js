const {appendFile, readFile, writeFile, readFileSync} = require('fs').promises;
const {solanaWeb3, LAMPORTS_PER_SOL, SystemProgram, Connection, Keypair, Transaction, sendAndConfirmTransaction,PublicKey} = require("@solana/web3.js");
const bs58 = require("bs58");
const figlet = require("figlet");
const walletFile = "wallet.json"; // Define wallet file path globally
const args = process.argv.slice(2);
const establishConnection = async () => {
    rpcUrl = "https://api.devnet.solana.com";
    connection = new Connection(rpcUrl, 'confirmed');
}

const readSpecificLine = async (filePath, lineNumber) => {
    try {
        const data = await readFile(filePath, 'utf8');
        const lines = data.split('\n');
        return (lineNumber >= 0 && lineNumber < lines.length) ? lines[lineNumber] : 'Invalid line number.';
    } catch (error) {
        console.error('Error:', error);
    }
}

const requestAirdrop = async () => {
    let amount = 1;
    if (args.length >= 2) amount = parseInt(args[1]);
    if (isNaN(amount)) return "Please enter the line index number of wallet in wallet.json.";
    const selectedWalletPrivateKey = await readSpecificLine(walletFile, parseInt(await readSpecificLine(walletFile, 0)));
    const selectedWalletKeypair = Keypair.fromSecretKey(bs58.decode(selectedWalletPrivateKey.split(':')[0]));
    const txhash = await connection.requestAirdrop(selectedWalletKeypair.publicKey, amount);
    return `txhash: ${txhash}`;
};

const createAccount = async () => {
    const Info = await connection.getEpochInfo();
    console.log("---------------------\n", Info);
    const keyPair = Keypair.generate();
    console.log("Public Key:", keyPair.publicKey.toString());
    console.log("Secret Key (Byte):", keyPair.secretKey);
    console.log("Secret Key (Base58):", bs58.encode(keyPair.secretKey));
    try {
        await appendFile(walletFile, bs58.encode(keyPair.secretKey) + ":0\n");
        //console.log("\nFile Contents of file after append:", readFileSync(walletFile, "utf8"));
    } catch (err) {
        console.log(err);
    }
    return "\nThe wallet is created.";
};

const getBalance = async () => {
    const selectedWalletLineIndexNo = parseInt(await readSpecificLine(walletFile, 0));
    const selectedWalletPrivateKey = await readSpecificLine(walletFile, selectedWalletLineIndexNo);
    const selectedWalletKeypair = Keypair.fromSecretKey(bs58.decode(selectedWalletPrivateKey.split(':')[0]));
    const tokenAmount = await connection.getBalance(selectedWalletKeypair.publicKey);
    await readFile(walletFile, 'utf8', (error, data) => {
        if (error) {
            console.error('File read error:', error);
            return;
        }
        const lines = data.split('\n');
        lines[0].split(":")[1] = tokenAmount / LAMPORTS_PER_SOL;
        const newData = lines.join('\n');
        writeFile(filePath, newData, 'utf8', (error) => {
            if (error) {
                console.error('File write error:', error);
                return;
            }
        });
    });
    return `The selected wallet has ${tokenAmount / LAMPORTS_PER_SOL} SOL`;
}
const transfer = async () => {
    if (isNaN(args[2])) return "Please enter the number for transferring token.";
    const selectedWalletPrivateKey = await readSpecificLine(walletFile, parseInt(await readSpecificLine(walletFile, 0)));
    const selectedWalletKeypair = Keypair.fromSecretKey(bs58.decode(selectedWalletPrivateKey.split(':')[0]));
    const transferTransaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: selectedWalletKeypair.publicKey,
            toPubkey: new PublicKey(args[1]),
            lamports: args[2] * LAMPORTS_PER_SOL,
        })
    );
    const txhash = await await sendAndConfirmTransaction(connection, transferTransaction, [selectedWalletKeypair]);
    return `txhash: ${txhash}`;
}

const selectWallet = async () => {
    if (isNaN(args[1])) return "Please enter the line index number of wallet in wallet.json.";
    try {
        const data = await readFile(walletFile, 'utf8');
        const lines = data.split('\n');
        lines[0] = args[1];
        const updatedContent = lines.join('\n');
        await writeFile(walletFile, updatedContent, 'utf8');
        return `${args[1]} is selected.`;
    } catch (error) {
        console.error('Error:', error);
    }
}

const showHelp = () => {
    console.log("\n\n" +
        figlet.textSync("Solana Wallet Manager", {
            horizontalLayout: "fitted",
            verticalLayout: "fitted",
            whitespaceBreak: false,
        })
    );
    console.log('----> Developed by GitHub.com/EnesBuyuk - EnesBuyuk.com\n\n')
    console.log('Usage: node wallet.js [options]');
    console.log('Options:');
    console.log('  new                                 Create new wallet.');
    console.log('  airdrop [amount]                    Request an airdrop.');
    console.log('  balance                             Get the balance of the selected wallet.');
    console.log('  transfer [otherPublicKey] [Amount]  Make a transfer from the selected wallet.');
    console.log('  select [walletFileLineIndexNo]      Choose a wallet for transactions.');
    console.log('  --help                              Display this help menu.');
};

const main = async () => {
    if (args.length >= 1) {
        if (args.includes('--help')) {
            showHelp();
        } else {
            establishConnection().then();

            switch (args[0]) {
                case 'new':
                    createAccount().then(r => console.log(r));
                    break;
                case 'airdrop':
                    if (args.length >= 1) {
                        requestAirdrop().then(r => console.log(r));
                    } else {
                        console.log("Missing parameter! USAGE: wallet.js airdrop [amount] (Note: Default amount is 1.)");
                    }
                    break;
                case 'balance':
                    getBalance().then(r => console.log(r));
                    break;
                case 'transfer':
                    if (args.length >= 2) {
                        transfer().then(r => console.log(r));
                    } else {
                        console.log("Missing parameter! USAGE: wallet.js transfer [otherPublicKey] [amount]");
                    }
                    break;
                case 'select':
                    if (args.length >= 2) {
                        selectWallet().then(r => console.log(r));
                    } else {
                        console.log("Missing parameter! USAGE: wallet.js select [walletFileLineIndexNo]");
                    }
                    break;
                default:
                    console.log("There is no such command. You can see all commands by typing --help.")
                    break;
            }
        }
    } else {
        console.log("There is no such command. You can see all commands by typing --help.")
    }
};

main();
