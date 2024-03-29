import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (
    <div id="container" style = {{ paddingTop: "3px", margin: "auto"}}>
    <main style={{ backgroundColor: "#FFFFE0", display: 'flex',height: "100vh"}}>



    <div id = "center" style={{  padding: "30px", display: "flex", flex: 1,  flexDirection: "column"}}>
          <div style={{ display : "flex", justifyContent: "space-between"}}>
            <h2 id = "bananas" style= {{color: "Black" }}>BABY BANANAS</h2>

            <img className = "head" src="favicon.ico"/>
            
            <div>
              <ConnectButton id = "connectooor">{wallet ? "Connected" : "Connect Wallet"}</ConnectButton>
            </div>
            
          </div>
          <div id = "head" style={{ paddingTop: "10px",  backgroundColor: "pink", flex: 1,display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column"}}>

          <div className="banana">
          <img src='https://i.imgur.com/pRK2n5n.gif'/>
           </div>


            <MintContainer className = "mintbuttons" style = {{
  alignItems: "center"}}>
            <h1> BABY BANANAS </h1>
            <h1>      0.2 SOL EACH</h1>
            
            {wallet && (
                <p>Address:  {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
              )}

            {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}

                <MintButton
                  className = "mintnow"
                
                  disabled={isSoldOut || isMinting || !isActive}
                  onClick={onMint}
                  variant="contained"
                >
                  {isSoldOut ? (
                    "SOLD OUT"
                  ) : isActive ? (
                    isMinting ? (
                      <CircularProgress />
                    ) : (
                      "MINT NOW"
                    )
                  ) : (
                    <Countdown
                      date={startDate}
                      onMount={({ completed }) => completed && setIsActive(true)}
                      onComplete={() => setIsActive(true)}
                      renderer={renderCounter}
                    />
                  )}

                </MintButton>
            {wallet && <p>( Remaining : {itemsRemaining} )</p>}


            </MintContainer>

            <div>


          </div>



          </div>



            <Snackbar
              open={alertState.open}
              autoHideDuration={6000}
              onClose={() => setAlertState({ ...alertState, open: false })}
            >
              <Alert
                onClose={() => setAlertState({ ...alertState, open: false })}
                severity={alertState.severity}
              >
                {alertState.message}
              </Alert>
            </Snackbar>
          
          <div id = "twitter" className ="button_cont text-center" >
            <a className = "jointwtr" style = {{margin: "16px"}} href="https://twitter.com/BabyBananasNFT">Join Twitter</a>

            <a className = "jointwtr" style = {{margin: "16px"}} href="https://discord.gg/Rx3FRz3dHj"> Join Discord</a> 

          </div>


          </div>





    </main>

    <section className="faq">
    <h1>                 </h1>
    <h1> <br/> FREQUENTLY ASKED QUESTIONS </h1>
        <section className= "faqmain">

          <details>
            <summary> ARE YOU AFFILIATED WITH SOLANA BANANAS? </summary>
            <div className="faq_content">
            <p>No, but they are our parents and we love them </p>
            </div>
          </details>

        <details>
          <summary> WHAT SOLANA WALLET IS SUPPORTED? </summary>
          <div className="faq_content">
          <p>Phantom (recommended), Slope, Solfare and Sollet</p>
          </div>
        </details>
        <details>
          <summary> WHAT ARE YOUR PLANS AFTER MINT? </summary>
          <div className="faq_content">
          <p> Listing and airdropping $BBNANA tokens to holders. <br/> Banana Holders Together = Strong</p>
          </div>
        </details>
        <details>
          <summary> HOW MUCH IS MINT </summary>
          <div className="faq_content">
          <p>Mint is 0.2 sol</p>
          </div>
        </details>
        <details>
          <summary> HOW MANY BABY BANANAS ARE THERE? </summary>
          <div className="faq_content">
          <p>1500 - One for each Solana Banana</p>
          </div>
        </details>
        <details>
          <summary> ANY ROYALTIES ON SECONDARY SALES? </summary>
          <div className="faq_content">
          <p>2.5%</p>
          </div>
        </details>
        <details>
          <summary> WEN MARKETPLACE? </summary>
          <div className="faq_content">
          <p> As soon as we're sold out</p>
          </div>
        </details>


        </section>



    </section>



    </div>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

// Check for mobile user agent
var mobile = (/iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(navigator.userAgent.toLowerCase()));
if (mobile) {
    alert("Mobile is not supported, Please switch to Desktop View");              
} else {
    
}  

export default Home;
