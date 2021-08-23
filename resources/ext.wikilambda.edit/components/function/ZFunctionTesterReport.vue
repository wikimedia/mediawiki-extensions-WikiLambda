<template>
	<!--
		WikiLambda Vue component for displaying the results of running testers against a function's implementations.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h2>{{ $i18n( 'wikilambda-tester-results-title' ) }}</h2>
		<template v-if="zFunctionId && implementations.length > 0 && testers.length > 0">
			<table
				class="ext-wikilambda-fn-tester-results"
			>
				<caption>{{ $i18n( 'wikilambda-tester-results-caption' ) }}</caption>
				<thead>
					<tr>
						<th scope="col"></th>
						<th
							v-for="implementation in implementations"
							:key="implementation"
							scope="col"
						>
							{{ getZkeyLabels[ implementation ] }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(test, index) in testers" :key="index">
						<template v-if="typeof test === 'string'">
							<th scope="row">
								{{ getZkeyLabels[ test ] }}
							</th>
							<td v-for="implementation in implementations" :key="implementation">
								<z-tester-impl-result
									:z-function-id="zFunctionId"
									:z-implementation-id="implementation"
									:z-tester-id="test"
									@set-keys="setActiveTesterKeys"
								></z-tester-impl-result>
							</td>
						</template>
						<template v-else>
							<th scope="row">
								{{ test.Z2K3.Z12K1[ 0 ].Z11K2.Z6K1 }}
							</th>
							<td v-for="implementation in implementations" :key="implementation">
								<z-tester-impl-result
									:z-function-id="zFunctionId"
									:z-implementation-id="implementation"
									:z-tester-id="test.Z2K1.Z9K1"
									@set-keys="setActiveTesterKeys"
								></z-tester-impl-result>
							</td>
						</template>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td>
							<slot name="run-testers" :click="runTesters">
								<button v-if="!viewmode" @click="runTesters">
									{{ $i18n( 'wikilambda-tester-run-testers' ) }}
								</button>
							</slot>
						</td>
						<td :colspan="implementations.length" class="results">
							{{ $i18n( 'wikilambda-tester-results-percentage-label' ) }}:
							{{ resultCount.passing }}/{{ resultCount.total }} ({{ resultCount.percentage }}%)
						</td>
					</tr>
				</tfoot>
			</table>
			<div v-if="getZTesterResults( zFunctionId, activeZTesterId, activeZImplementationId ) !== undefined">
				<h3>
					{{ $i18n( 'wikilambda-tester-results-subtitle' ) }}
					{{ getZkeyLabels[ activeZImplementationId ] }}
					( {{ getZkeyLabels[ activeZTesterId ] || getNewTesterZObjects[ 0 ].Z2K3.Z12K1[ 0 ].Z11K2.Z6K1 }} )
				</h3>
				<ul>
					<li>
						{{ $i18n( 'wikilambda-tester-status-label' ) }}:
						{{ activeTesterStatus }}
					</li>
					<li v-if="!getZTesterResults( zFunctionId, activeZTesterId, activeZImplementationId )">
						{{ $i18n( 'wikilambda-tester-failure-reason' ) }}:
						{{ activeTesterFailReason }}
					</li>
					<li>
						{{ $i18n( 'wikilambda-tester-function-duration' ) }}:
						{{ getZTesterMetadata( zFunctionId, activeZTesterId, activeZImplementationId ).duration }} ms
					</li>
				</ul>
			</div>
		</template>
		<div v-else>
			<p>{{ $i18n( 'wikilambda-tester-no-results' ) }}</p>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZTesterImplResult = require( './ZTesterImplResult.vue' );

module.exports = {
	components: {
		'z-tester-impl-result': ZTesterImplResult
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zFunctionId: {
			type: String,
			required: true
		},
		zImplementationId: {
			type: String,
			default: null
		},
		zTesterId: {
			type: String,
			default: null
		}
	},
	data: function () {
		return {
			activeZImplementationId: null,
			activeZTesterId: null
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZkeyLabels',
		'getZkeys',
		'getNestedZObjectById',
		'getZObjectAsJsonById',
		'getZTesterPercentage',
		'getCurrentZObjectId',
		'getNewTesterZObjects',
		'getZTesterResults',
		'getZTesterMetadata',
		'getZTesterFailReason'
	] ), {
		implementations: function () {
			if ( !this.zFunctionId || !this.getZkeys[ this.zFunctionId ] ) {
				return [];
			}

			if ( this.zImplementationId ) {
				return [ this.zImplementationId ];
			}

			if ( this.getCurrentZObjectId === this.zFunctionId ) {
				return this.getZObjectAsJsonById(
					this.getNestedZObjectById( 0, [
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_FUNCTION_IMPLEMENTATIONS
					] ).id,
					true
				).map( function ( impl ) {
					return impl[ Constants.Z_REFERENCE_ID ];
				} );
			}

			return this.getZkeys[ this.zFunctionId ][
				Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_FUNCTION_IMPLEMENTATIONS ];
		},
		testers: function () {
			if ( !this.zFunctionId || !this.getZkeys[ this.zFunctionId ] ) {
				return [];
			}

			if ( this.zTesterId ) {
				return [ this.zTesterId ];
			}

			if ( this.getCurrentZObjectId === this.zFunctionId ) {
				var savedTesters = this.getZObjectAsJsonById(
						this.getNestedZObjectById( 0, [
							Constants.Z_PERSISTENTOBJECT_VALUE,
							Constants.Z_FUNCTION_TESTERS
						] ).id,
						true
					).map( function ( impl ) {
						return impl[ Constants.Z_REFERENCE_ID ];
					} ),
					newTesters = this.getNewTesterZObjects;

				return savedTesters.concat( newTesters );
			}

			return this.getZkeys[ this.zFunctionId ][
				Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_FUNCTION_TESTERS ];
		},
		resultCount: function () {
			return this.getZTesterPercentage( this.zFunctionId );
		},
		activeTesterStatus: function () {
			return this.getZTesterResults(
				this.zFunctionId,
				this.activeZTesterId,
				this.activeZImplementationId
			) === true ?
				this.$i18n( 'wikilambda-tester-status-passed' ) :
				this.$i18n( 'wikilambda-tester-status-failed' );
		},
		activeTesterFailReason: function () {
			var reason = this.getZTesterFailReason(
					this.zFunctionId,
					this.activeZTesterId,
					this.activeZImplementationId
				),
				expected,
				actual;

			if ( !reason ) {
				return '';
			}

			expected = this.zObjectToString( reason[ 0 ] );
			actual = this.zObjectToString( reason[ 1 ] );

			return this.$i18n( 'wikilambda-tester-failure-expected' ) + ' ' +
				expected + '. ' +
				this.$i18n( 'wikilambda-tester-failure-actual' ) + ' ' +
				actual + '.';
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchZKeys', 'getTestResults' ] ), {
		runTesters: function () {
			this.getTestResults( {
				zFunctionId: this.zFunctionId,
				zImplementations: this.implementations,
				zTesters: this.testers,
				nocache: true,
				clearPreviousResults: true
			} );
		},
		setActiveTesterKeys: function ( keys ) {
			this.activeZImplementationId = keys.zImplementationId;
			this.activeZTesterId = keys.zTesterId;
		}
	} ),
	watch: {
		implementations: function () {
			this.fetchZKeys( this.implementations );
		},
		testers: function () {
			this.fetchZKeys( this.testers );
		}
	},
	mounted: function () {
		this.fetchZKeys( this.implementations.concat( this.testers ) )
			.then( function () {
				setTimeout( this.runTesters, 1000 );
			}.bind( this ) );
	}
};
</script>

<style lang="less">
.ext-wikilambda-fn-tester-results {
	border-spacing: 10px 5px;
	max-width: 90vw;
	overflow-x: auto;
}

.ext-wikilambda-fn-tester-results caption {
	white-space: nowrap;
}

.ext-wikilambda-fn-tester-results tfoot td.results {
	padding: 10px 0;
	border-top: 3px double #000;
	text-align: right;
}
</style>
