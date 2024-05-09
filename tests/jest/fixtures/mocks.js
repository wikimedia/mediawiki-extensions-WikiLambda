/*!
 * WikiLambda unit test suite mock objects.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const mockFunction = {
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

/**
 * Returns builtin objects Z1, Z3, Z6, Z31, Z32, Z802, Z881, Z882, Z1003
 * And custom objects Z10001, Z10528, Z20001, Z20002, Z20003
 */
const mockApiZids = {
	Z1: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z1'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z1',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z4',
					Z3K2: 'Z1K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'type'
							}
						]
					}
				}
			],
			Z4K3: 'Z101'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11',
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Object'
				}
			]
		}
	},
	Z2: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z2'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z2',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z2K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'id'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z1',
					Z3K2: 'Z2K2',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'value'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z12',
					Z3K2: 'Z2K3',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'label'
							}
						]
					}
				}
			],
			Z4K3: 'Z102'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11',
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Persistent object'
				}
			]
		}
	},
	Z3: {
		Z1K1: "Z2",
		Z2K1: {
			Z1K1: "Z6",
			Z6K1: "Z3"
		},
		Z2K2: {
			Z1K1: "Z4",
			Z4K1: "Z3",
			Z4K2: [
				"Z3",
				{
					Z1K1: "Z3",
					Z3K1: "Z4",
					Z3K2: "Z3K1",
					Z3K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "value type"
							}
						]
					}
				},
				{
					Z1K1: "Z3",
					Z3K1: "Z6",
					Z3K2: "Z3K2",
					Z3K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "key id"
							}
						]
					}
				},
				{
					Z1K1: "Z3",
					Z3K1: "Z12",
					Z3K2: "Z3K3",
					Z3K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "label"
							}
						]
					}
				}
			],
			Z4K3: "Z103"
		},
		Z2K3: {
			Z1K1: "Z12",
			Z12K1: [
				"Z11",
				{
					Z1K1: "Z11",
					Z11K1: "Z1002",
					Z11K2: "Key"
				}
			]
		}
	},
	Z6: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z6'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z6',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z6K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'value'
							}
						]
					}
				}
			],
			Z4K3: 'Z106'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11',
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'String'
				}
			]
		}
	},
	Z31: {
		Z1K1: "Z2",
		Z2K1: {
			Z1K1: "Z6",
			Z6K1: "Z31"
		},
		Z2K2: {
			Z1K1: "Z4",
			Z4K1: "Z31",
			Z4K2: [
				"Z3",
				{
					Z1K1: "Z3",
					Z3K1: "Z60",
					Z3K2: "Z31K1",
					Z3K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "language"
							}
						]
					}
				},
				{
					Z1K1: "Z3",
					Z3K1: {
						Z1K1: "Z7",
						Z7K1: "Z881",
						Z881K1: "Z6"
					},
					Z3K2: "Z31K2",
					Z3K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "stringset"
							}
						]
					}
				}
			],
			Z4K3: "Z131"
		},
		Z2K3: {
			Z1K1: "Z12",
			Z12K1: [
				"Z11",
				{
					Z1K1: "Z11",
					Z11K1: "Z1002",
					Z11K2: "Monolingual stringset"
				}
			]
		}
	},
	Z882: {
		Z1K1: "Z2",
		Z2K1: {
			Z1K1: "Z6",
			Z6K1: "Z882"
		},
		Z2K2: {
			Z1K1: "Z8",
			Z8K1: [
				"Z17",
				{
					Z1K1: "Z17",
					Z17K1: "Z4",
					Z17K2: "Z882K1",
					Z17K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "first type"
							}
						]
					}
				},
				{
					Z1K1: "Z17",
					Z17K1: "Z4",
					Z17K2: "Z882K2",
					Z17K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "second type"
							}
						]
					}
				}
			],
			Z8K2: "Z4",
			Z8K3: [
				"Z20"
			],
			Z8K4: [
				"Z14",
				"Z982"
			],
			Z8K5: "Z882"
		},
		Z2K3: {
			Z1K1: "Z12",
			Z12K1: [
				"Z11",
				{
					Z1K1: "Z11",
					Z11K1: "Z1002",
					Z11K2: "Typed pair"
				}
			]
		}
	},
	Z32: {
		Z1K1: "Z2",
		Z2K1: {
			Z1K1: "Z6",
			Z6K1: "Z32"
		},
		Z2K2: {
			Z1K1: "Z4",
			Z4K1: "Z32",
			Z4K2: [
				"Z3",
				{
					Z1K1: "Z3",
					Z3K1: {
						Z1K1: "Z7",
						Z7K1: "Z881",
						Z881K1: "Z31"
					},
					Z3K2: "Z32K1",
					Z3K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "stringset"
							}
						]
					}
				}
			],
			Z4K3: "Z132"
		},
		Z2K3: {
			Z1K1: "Z12",
			Z12K1: [
				"Z11",
				{
					Z1K1: "Z11",
					Z11K1: "Z1002",
					Z11K2: "Multilingual stringset"
				}
			]
		}
	},
	Z802: {
		Z1K1: "Z2",
		Z2K1: {
			Z1K1: "Z6",
			Z6K1: "Z802"
		},
		Z2K2: {
			Z1K1: "Z8",
			Z8K1: [
				"Z17",
				{
					Z1K1: "Z17",
					Z17K1: "Z40",
					Z17K2: "Z802K1",
					Z17K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "condition"
							}
						]
					}
				},
				{
					Z1K1: "Z17",
					Z17K1: "Z1",
					Z17K2: "Z802K2",
					Z17K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "then"
							}
						]
					}
				},
				{
					Z1K1: "Z17",
					Z17K1: "Z1",
					Z17K2: "Z802K3",
					Z17K3: {
						Z1K1: "Z12",
						Z12K1: [
							"Z11",
							{
								Z1K1: "Z11",
								Z11K1: "Z1002",
								Z11K2: "else"
							}
						]
					}
				}
			],
			Z8K2: "Z1",
			Z8K3: [
				"Z20",
				"Z8020",
				"Z8021"
			],
			Z8K4: [
				"Z14",
				"Z902"
			],
			Z8K5: "Z802"
		},
		Z2K3: {
			Z1K1: "Z12",
			Z12K1: [
				"Z11",
				{
					Z1K1: "Z11",
					Z11K1: "Z1002",
					Z11K2: "If"
				}
			]
		}
	},
	Z881: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z881'
		},
		Z2K2: {
			Z1K1: 'Z8',
			Z8K1: [
				'Z17',
				{
					Z1K1: 'Z17',
					Z17K1: 'Z4',
					Z17K2: 'Z881K1',
					Z17K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'item type'
							}
						]
					}
				}
			],
			Z8K2: 'Z4',
			Z8K3: [
				'Z20'
			],
			Z8K4: [
				'Z14',
				'Z981'
			],
			Z8K5: 'Z881'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11',
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Typed list'
				}
			]
		}
	},
	Z10001: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z10001'
		},
		Z2K2: 'some object without keys',
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [ 'Z11' ]
		}
	},
	Z1003: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z1003'
		},
		Z2K2: {
			Z1K1: 'Z60',
			Z60K1: 'es'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11',
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Spanish'
				},
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1003',
					Z11K2: 'español'
				}
			]
		}
	},
	Z10528: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z10528'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z10528',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z10528',
					Z3K2: 'Z10528K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
				}
			],
			Z4K3: 'Z106',
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11'
			]
		}
	},
	Z20001: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20001'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20001',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z20002',
					Z3K2: 'Z20001K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'my friend'
							}
						]
					}
				}
			],
			Z4K3: 'Z106'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11',
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1003',
					Z11K2: 'mi amigo'
				}
			]
		}
	},
	Z20002: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20002'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20002',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z20003',
					Z3K2: 'Z20002K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'my best friend'
							}
						]
					}
				}
			],
			Z4K3: 'Z106',
			Z4K4: 'Z20010',
			Z4K5: 'Z20020',
			Z4K6: 'Z20030'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11'
			]
		}
	},
	Z20003: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20003'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20003',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z20002',
					Z3K2: 'Z20003K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'my frenemy'
							}
						]
					}
				}
			],
			Z4K3: 'Z106'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11'
			]
		}
	},
	Z20004: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20004'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20004',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20004K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20004K2',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20004K3',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
				}
			],
			Z4K3: 'Z101'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [ 'Z11' ]
		}
	},
	Z20005: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20005'
		},
		Z2K2: {
			Z1K1: 'Z14',
			Z14K1: 'Z20000',
			Z14K3: {
				Z1K1: 'Z16',
				Z16K1: 'Z600',
				Z16K2: '() => "some code";'
			}
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [ 'Z11' ]
		}
	},
	Z20006: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20006'
		},
		Z2K2: {
			Z1K1: 'Z14',
			Z14K1: 'Z20000',
			Z14K3: {
				Z1K1: 'Z16',
				Z16K1: {
					Z1K1: 'Z61',
					Z61K1: 'javascript'
				},
				Z16K2: '() => "some code";'
			}
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [ 'Z11' ]
		}
	},
	Z20007: {
		Z1K1: 'Z2',
		Z2K1: {
			Z1K1: 'Z6',
			Z6K1: 'Z20007'
		},
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20007',
			Z4K2: [
				'Z3',
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20007K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20007K2',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					},
					Z3K4: 'Z42'
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20007K3',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					},
					Z3K4: 'Z41'
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z20007K4',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					},
					Z3K4: {
						Z1K1: 'Z40',
						Z40K1: 'Z41'
					}
				}
			],
			Z4K3: 'Z101'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [ 'Z11' ]
		}
	},
};

/**
 * Returns the API response object for the given zids
 * The zids must be declared in mockApiZids
 */
const mockApiResponseFor = function ( zids ) {
	const objects = {};
	for( const zid of zids ) {
		objects[ zid ] = {
			success: '',
			data: mockApiZids[ zid ]
		};
	}
	return {
		batchcomplete: '',
		query: {
			wikilambdaload_zobjects: objects
		}
	};
};

const mockLanguages = {
	batchcomplete: true,
	query: {
		languageinfo: {
			es: {
				code: "es",
				autonym: "español",
				name: "Spanish"
			},
			en: {
				code: "en",
				autonym: "English",
				name: "English"
			},
			el: {
				code: "el",
				autonym: "Ελληνικά",
				name: "Greek"
			},
			it: {
				code: "it",
				autonym: "italiano",
				name: "Italian"
			},
			nap: {
				code: "nap",
				autonym: "Napulitano",
				name: "Neapolitan"
			},
			oc: {
				code: "oc",
				autonym: "occitan",
				name: "Occitan"
			},
			hr: {
				code: "hr",
				autonym: "hrvatski",
				name: "Croatian"
			},
			ca: {
				code: "ca",
				autonym: "català",
				name: "Catalan"
			},
			ast: {
				code: "ast",
				autonym: "asturianu",
				name: "Asturian"
			},
			eu: {
				code: "eu",
				autonym: "euskara",
				name: "Basque"
			}
		}
	}
};

module.exports = {
	mockFunction,
	mockApiResponseFor,
	mockApiZids,
	mockLanguages
};
