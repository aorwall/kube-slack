const fs = require('fs');
const config = require('config');
const Api = require('kubernetes-client');

class Kubernetes {
	constructor() {
		this.kube = new Api.Core(this.getConfig());
		this.currentNamespaceOnly = config.get('currentNamespaceOnly');
	}

	getConfig() {
		let cfg = config.get('kube');

		if (cfg.kubeconfig) {
			return Api.config.fromKubeconfig();
		} else if (cfg.inCluster) {
			return Api.config.getInCluster();
		}

		// these keys are path to file
		let fileKey = ['ca', 'cert', 'key'];
		for (let key of fileKey) {
			if (cfg[key]) {
				cfg[key] = fs.readFileSync(cfg[key]);
			}
		}

		return cfg;
	}

	getPods() {
		const promise = this.currentNamespaceOnly
			? this.kube.namespaces.pods.get()
			: this.kube.pods.get();
		return promise.then(list => list.items);
	}

	async getContainerStatuses() {
		let pods = await this.getPods();
		let out = [];
		for (let item of pods) {
			if (!item.status.containerStatuses) {
				continue;
			}
			for (let container of item.status.containerStatuses) {
				container.pod = item;
				out.push(container);
			}
		}
		return out;
	}
}

module.exports = new Kubernetes();
