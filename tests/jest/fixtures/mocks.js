var mockLabels = {
	Z1K1: {
		Z1K1: 'Z9',
		Z9K1: 'Z2'
	},
	Z2K1: {
		Z1K1: 'Z6',
		Z6K1: 'Z10018'
	},
	Z2K2: {
		Z1K1: {
			Z1K1: 'Z9',
			Z9K1: 'Z8'
		},
		Z8K1: [
			{},
			{}
		],
		Z8K2: {
			Z1K1: 'Z9',
			Z9K1: 'Z10019'
		},
		Z8K3: [],
		Z8K4: [],
		Z8K5: {
			Z1K1: 'Z9',
			Z9K1: 'Z10018'
		}
	},
	Z2K3: {
		Z1K1: {
			Z1K1: 'Z9',
			Z9K1: 'Z12'
		},
		Z12K1: [
			{
				Z1K1: {
					Z1K1: 'Z9',
					Z9K1: 'Z11'
				},
				Z11K1: {
					Z1K1: 'Z9',
					Z9K1: 'Z1002'
				},
				Z11K2: {
					Z1K1: 'Z6',
					Z6K1: 'label'
				}
			}
		]
	},
	Z2K4: {
		Z1K1: {
			Z1K1: 'Z9',
			Z9K1: 'Z32'
		},
		Z32K1: []
	}
};

module.exports = { mockLabels };