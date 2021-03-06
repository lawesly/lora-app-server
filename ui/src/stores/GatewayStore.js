import { EventEmitter } from "events";
import ReconnectingWebSocket from 'reconnecting-websocket';

import sessionStore from "./SessionStore";
import { checkStatus, errorHandler } from "./helpers";
import dispatcher from "../dispatcher";


class GatewayStore extends EventEmitter {
  getAll(pageSize, offset, callbackFunc) {
    fetch("/api/gateways?limit="+pageSize+"&offset="+offset, {headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        if(typeof(responseData.result) === "undefined") {
          callbackFunc(0, []);
        } else {
          callbackFunc(responseData.totalCount, responseData.result);
        }
      })
      .catch(errorHandler);
  }

  getAllForOrganization(organizationID, pageSize, offset, callbackFunc) {
    fetch("/api/gateways?organizationID="+organizationID+"&limit="+pageSize+"&offset="+offset, {headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        if(typeof(responseData.result) === "undefined") {
          callbackFunc(0, []);
        } else {
          callbackFunc(responseData.totalCount, responseData.result);
        }
      })
      .catch(errorHandler);
  }

  getGatewayStats(mac, interval, start, end, callbackFunc) {
    fetch("/api/gateways/"+mac+"/stats?interval="+interval+"&startTimestamp="+start+"&endTimestamp="+end, {headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        if(typeof(responseData.result) === "undefined") {
          callbackFunc([]);
        } else {
          callbackFunc(responseData.result);
        }
      })
      .catch(errorHandler);
  }

  getGateway(mac, callbackFunc) {
    fetch("/api/gateways/"+mac, {headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        callbackFunc(responseData);
      })
      .catch(errorHandler);
  }

  createGateway(gateway, callbackFunc) {
    fetch("/api/gateways", {method: "POST", body: JSON.stringify(gateway), headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        callbackFunc(responseData);
      })
      .catch(errorHandler);
  }

  deleteGateway(mac, callbackFunc) {
    fetch("/api/gateways/"+mac, {method: "DELETE", headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        callbackFunc(responseData);
      })
      .catch(errorHandler);
  }

  updateGateway(mac, gateway, callbackFunc) {
    fetch("/api/gateways/"+mac, {method: "PUT", body: JSON.stringify(gateway), headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        this.emit("change");
        callbackFunc(responseData);
      })
      .catch(errorHandler);
  }

  getLastPing(mac, callbackFunc) {
    fetch("/api/gateways/"+mac+"/pings/last", {headers: sessionStore.getHeader()})
      .then(checkStatus)
      .then((response) => response.json())
      .then((responseData) => {
        callbackFunc(responseData);
      })
      .catch(errorHandler);
  }

  getFrameLogsConnection(mac, onOpen, onClose, onData) {
    const loc = window.location;
    const wsURL = (() => {
      if (loc.host === "localhost:3000") {
        return `wss://localhost:8080/api/gateways/${mac}/frames`;
      }

      const wsProtocol = loc.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${loc.host}/api/gateways/${mac}/frames`;
    })();

    const conn = new ReconnectingWebSocket(wsURL, ["Bearer", sessionStore.getToken()]);
    conn.onopen = () => {
      console.log('connected to', wsURL);
      onOpen();
    };

    conn.onclose = () => {
      console.log('closing', wsURL);
      onClose();
    };

    conn.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.error !== undefined) {
        dispatcher.dispatch({
          type: "CREATE_ERROR",
          error: {
            code: msg.error.grpcCode,
            error: msg.error.message,
          },
        });
      } else if (msg.result !== undefined) {
        onData(msg.result);
      }
    };

    return conn;
  }
}

const gatewayStore = new GatewayStore();

export default gatewayStore;
