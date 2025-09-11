/*!
 * WikiLambda unit test suite mock metadata objects.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const convertSetToMap = function ( set ) {
	const map = {
		Z1K1: { Z1K1: "Z7", Z7K1: "Z883", Z883K1: "Z6", Z883K2: "Z1" },
		K1: [
			{ Z1K1: "Z7", Z7K1: "Z882", Z882K1: "Z6", Z882K2: "Z1" }
		]
	};
	for ( const key in set ) {
		const pair = {
			Z1K1: { Z1K1: "Z7", Z7K1: "Z882", Z882K1: "Z6", Z882K2: "Z1" },
			K1: key,
			K2: set[ key ]
		};
		map.K1.push( pair );
	}
	return map;
};

const metadataBasic = convertSetToMap( {
	implementationId: { Z1K1: "Z6", Z6K1: "Z902" },
	implementationType: 'Evaluated',
	// duration:
	orchestrationDuration: "70 ms",
	orchestrationStartTime: "2024-02-16T12:25:19.230Z",
	orchestrationEndTime: "2024-02-16T12:25:19.300Z",
	evaluationDuration: "10 ms",
	evaluationStartTime: "2024-02-16T12:25:19.240Z",
	evaluationEndTime: "2024-02-16T12:25:19.250Z",
	// cpu usage:
	orchestrationCpuUsage: "85.790 ms",
	evaluationCpuUsage: "45.110 ms",
	executionCpuUsage: "<50 μs",
	// memory usage:
	orchestrationMemoryUsage: "115.43 MiB",
	evaluationMemoryUsage: "15.57 MiB",
	executionMemoryUsage: "1 MiB",
	// hostnames:
	orchestrationHostname: "function-orchestrator",
	evaluationHostname: "function-evaluator-javascript",
	// programming language
	programmingLanguageVersion: "QuickJS v0.5.0-alpha"
} );


const metadataChild1 = convertSetToMap( {
	zObjectKey: 'Z801(Z41)',
	implementationId: { Z1K1: "Z6", Z6K1: "Z901" },
	implementationType: 'Evaluated',
	// duration:
	orchestrationDuration: "20 ms",
	orchestrationStartTime: "2024-02-16T12:25:19.240Z",
	orchestrationEndTime: "2024-02-16T12:25:19.260Z",
	evaluationDuration: "5 ms",
	evaluationStartTime: "2024-02-16T12:25:19.240Z",
	evaluationEndTime: "2024-02-16T12:25:19.245Z",
} );

const metadataChild2 = convertSetToMap( {
	// zObjectKey is missing
	implementationId: { Z1K1: "Z6", Z6K1: "Z901" },
	implementationType: 'Evaluated',
	// errors:
	errors: {
		Z1K1: "Z5",
		Z5K1: "Z500",
		Z5K2: {
			Z1K1: {
				Z1K1: "Z7",
				Z7K1: "Z885",
				Z885K1: "Z500"
			},
			Z500K1: "some error in child function call: <button onmouseover=\"window.location = '//www.example.com'\">",
		}
	},
	// duration:
	orchestrationDuration: "20 ms",
	orchestrationStartTime: "2024-02-16T12:25:19.270Z",
	orchestrationEndTime: "2024-02-16T12:25:19.290Z",
	evaluationDuration: "2 ms",
	evaluationStartTime: "2024-02-16T12:25:19.250Z",
	evaluationEndTime: "2024-02-16T12:25:19.252Z",
} );

const metadataChild3 = convertSetToMap( {
	zObjectKey: 'Z42',
	// incomplete metadata to test how the system handles minimal data
	// This could represent a partially implemented function or an incomplete condition
} );

const metadataNested = convertSetToMap( {
	zObjectKey: 'Z802(Z801(Z41),Z801("is true"),"is false")',
	implementationId: { Z1K1: "Z6", Z6K1: "Z902" },
	implementationType: 'Evaluated',
	// nestedMetadata:
	nestedMetadata: [
		{ Z1K1: "Z7", Z7K1: "Z883", Z883K1: "Z6", Z883K2: "Z1" }, // Represents Typed Map
		metadataChild1, // Represents Z801(Z41)
		metadataChild2, // Represents some error in child function call
		metadataChild3 // Represents incomplete metadata
	],
	// duration:
	orchestrationDuration: "70 ms",
	orchestrationStartTime: "2024-02-16T12:25:19.230Z",
	orchestrationEndTime: "2024-02-16T12:25:19.300Z",
	evaluationDuration: "10 ms",
	evaluationStartTime: "2024-02-16T12:25:19.240Z",
	evaluationEndTime: "2024-02-16T12:25:19.250Z",
} );

const metadataEmpty = convertSetToMap( {
	orchestrationDuration: "70 ms",
} );

const metadataErrors = convertSetToMap( {
	errors: {
		Z1K1: "Z5",
		Z5K1: "Z502",
		Z5K2: {
			Z1K1: {
				Z1K1: "Z7",
				Z7K1: "Z885",
				Z885K1: "Z502"
			},
			Z502K1: "Z523",
			Z502K2: {
				Z1K1: "Z5",
				Z5K1: "Z523",
				Z5K2: {
					Z1K1: {
						Z1K1: "Z7",
						Z7K1: "Z885",
						Z885K1: "Z523"
					},
					Z523K1: {
						Z1K1: "Z99",
						Z99K1: {
							Z6K1: "test"
						}
					}
				}
			}
		}
	},
	validateErrors: {
		Z1K1: "Z5",
		Z5K1: "Z526",
		Z5K2: {
			Z1K1: "Z526",
			Z526K1: "Z11K2",
			Z526K2: {
				Z1K1: "Z5",
				Z5K1: "Z521",
				Z5K2: {
					Z1K1: "Z521",
					Z521K1: {
						Z1K1: "Z99",
						Z99K1: false
					}
				}
			}
		}
	},
	expectedTestResult: 'ABC',
	actualTestResult: 'CBA'
} );

const metadataMaliciousError = convertSetToMap( {
	errors: {
		Z1K1: "Z5",
		Z5K1: "Z500",
		Z5K2: {
			Z1K1: {
				Z1K1: "Z7",
				Z7K1: "Z885",
				Z885K1: "Z500"
			},
			Z500K1: "<button onmouseover=\"window.location = '//www.example.com'\">"
		}
	}
} );

const metadataDifferButNoErrors = convertSetToMap( {
	expectedTestResult: 'ABC',
	actualTestResult: 'CBA'
} );

module.exports = {
	metadataBasic,
	metadataErrors,
	metadataMaliciousError,
	metadataEmpty,
	metadataNested,
	metadataDifferButNoErrors,
	convertSetToMap
};
