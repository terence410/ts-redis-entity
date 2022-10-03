import { Server } from "net";
import tunnel, {Config} from "tunnel-ssh";

export type IOptions = Config ;

export class SshTunnelHelper {
    public server?: Server;

    constructor(public options: IOptions) {

    }

    public async connect() {
        this.server = await new Promise((resolve, reject) => {
            tunnel(this.options, (error, currentServer) => {
                if (error) {
                    return reject(error);
                }

                resolve(currentServer);
            });
        });

        return this.server!;
    }

    public async disconnect() {
        this.server!.close();
    }
}
