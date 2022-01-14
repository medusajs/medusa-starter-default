import { BaseService } from "medusa-interfaces";

class MyCustomService2 extends BaseService {
	constructor({ manager, eventBusService }, options) {
		super();

		this.manager = manager;

		this.options = options;
		this.eventBusService = eventBusService
	}

	withTransaction(transactionManager) {
		if (!transactionManager) {
			return this;
		}

		const cloned = new MyCustomService2(
			{
				manager: transactionManager,
				eventBusService: this.eventBusService
			},
			this.options
		);

		cloned.transactionManager = transactionManager;

		return cloned;
	}
}

export default MyCustomService2;
