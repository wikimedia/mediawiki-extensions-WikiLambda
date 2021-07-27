<template>
	<!--
		WikiLambda Vue component for displaying the results of running testers against a function's implementations.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h2>{{ $i18n( 'wikilambda-tester-results-title' ) }}</h2>
		<table
			v-if="zFunctionId && implementations.length > 0 && testers.length > 0"
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
				<tr v-for="test in testers" :key="test">
					<th scope="row">
						{{ getZkeyLabels[ test ] }}
					</th>
					<td v-for="implementation in implementations" :key="implementation">
						<z-tester-impl-result
							:z-function-id="zFunctionId"
							:z-implementation-id="implementation"
							:z-tester-id="test"
						></z-tester-impl-result>
					</td>
				</tr>
			</tbody>
			<tfoot>
				<tr>
					<td>
						<button @click="runTesters">
							{{ $i18n( 'wikilambda-tester-run-testers' ) }}
						</button>
					</td>
					<td :colspan="implementations.length" class="results">
						{{ $i18n( 'wikilambda-tester-results-percentage-label' ) }}:
						{{ resultCount.passing }}/{{ resultCount.total }} ({{ resultCount.percentage }}%)
					</td>
				</tr>
			</tfoot>
		</table>
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
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZkeyLabels',
		'getZkeys',
		'getViewMode',
		'getNestedZObjectById',
		'getZObjectAsJsonById',
		'getZTesterPercentage',
		'getCurrentZObjectId'
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
			if ( !this.zFunctionId && !this.getZkeys[ this.zFunctionId ] ) {
				return [];
			}

			if ( this.zTesterId ) {
				return [ this.zTesterId ];
			}

			if ( this.getCurrentZObjectId === this.zFunctionId ) {
				return this.getZObjectAsJsonById(
					this.getNestedZObjectById( 0, [
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_FUNCTION_TESTERS
					] ).id,
					true
				).map( function ( impl ) {
					return impl[ Constants.Z_REFERENCE_ID ];
				} );
			}

			return this.getZkeys[ this.zFunctionId ][
				Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_FUNCTION_TESTERS ];
		},
		resultCount: function () {
			return this.getZTesterPercentage( this.zFunctionId );
		}
	} ),
	methods: $.extend( mapActions( [ 'prepareTest' ] ), {
		runTesters: function () {
			this.implementations.forEach( function ( implementation ) {
				this.testers.forEach( function ( tester ) {
					this.prepareTest( {
						zFunctionId: this.zFunctionId,
						zImplementationId: implementation,
						zTesterId: tester
					} );
				}.bind( this ) );
			}.bind( this ) );
		}
	} )
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
