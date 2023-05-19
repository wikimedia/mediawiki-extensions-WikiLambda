<template>
	<!--
		WikiLambda Vue component for ZFunction objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div>
			<h3>{{ zReturnTypeLabel }}</h3>
			<wl-z-object-selector
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-return-typeselector-label' ).text()"
				:selected-zid="zReturnType.value"
				@input="updateZReturnType"
			></wl-z-object-selector>
		</div>
		<wl-z-argument-list
			:zobject-id="zArgumentId"
		></wl-z-argument-list>
		<template v-if="!isCreateNewPage">
			<wl-z-implementation-list
				:zobject-id="zImplementationId"
			></wl-z-implementation-list>
			<wl-z-tester-list
				:zobject-id="zTesterId"
			></wl-z-tester-list>
			<wl-function-report-widget
				:z-function-id="zFunctionId"
			></wl-function-report-widget>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZArgumentList = require( './ZArgumentList.vue' ),
	ZImplementationList = require( '../function/ZImplementationList.vue' ),
	ZTesterList = require( '../function/ZTesterList.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	FunctionReportWidget = require( '../widgets/FunctionReport.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-function',
	components: {
		'wl-z-argument-list': ZArgumentList,
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-implementation-list': ZImplementationList,
		'wl-z-tester-list': ZTesterList,
		'wl-function-report-widget': FunctionReportWidget
	},
	mixins: [ typeUtils ],
	provide: function () {
		return {
			viewmode: this.viewmode || this.readonly
		};
	},
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getZkeyLabels',
			'getCurrentZObjectId',
			'getNestedZObjectById',
			'isCreateNewPage'
		] ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zFunctionId: function () {
				return this.getNestedZObjectById( this.zobjectId, [
					Constants.Z_FUNCTION_IDENTITY,
					Constants.Z_REFERENCE_ID
				] ).value;
			},
			zArgumentId: function () {
				return this.zobject.filter( function ( item ) {
					return item.key === Constants.Z_FUNCTION_ARGUMENTS;
				} )[ 0 ].id;
			},
			zArgumentList: function () {
				return this.getZObjectChildrenById( this.zArgumentId );
			},
			zImplementationId: function () {
				return this.zobject.filter( function ( item ) {
					return item.key === Constants.Z_FUNCTION_IMPLEMENTATIONS;
				} )[ 0 ].id;
			},
			zTesterId: function () {
				return this.zobject.filter( function ( item ) {
					return item.key === Constants.Z_FUNCTION_TESTERS;
				} )[ 0 ].id;
			},
			zReturnType: function () {
				var returnType = this.findKeyInArray( Constants.Z_FUNCTION_RETURN_TYPE, this.zobject );

				if ( returnType.value === 'object' ) {
					return this.findKeyInArray(
						[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
						this.getZObjectChildrenById( returnType.id )
					);
				}

				return returnType;
			},
			zReturnTypeLabel: function () {
				return this.getZkeyLabels[ Constants.Z_FUNCTION_RETURN_TYPE ];
			}
		}
	),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'setZObjectValue',
		'fetchZImplementations',
		'fetchZTesters',
		'setAvailableZArguments'
	] ), {
		updateZReturnType: function ( type ) {
			var payload = {
				id: this.zReturnType.id,
				value: type
			};

			this.setZObjectValue( payload );
		}
	} ),
	watch: {
		zFunctionId: {
			immediate: true,
			handler: function () {
				this.setAvailableZArguments( this.zFunctionId );
			}
		},
		zArgumentList: {
			immediate: true,
			handler: function () {
				this.setAvailableZArguments( this.zFunctionId );
			}
		}
	},
	mounted: function () {

		var zids = [ Constants.Z_ARGUMENT ];
		if ( this.zReturnType && this.zReturnType.value ) {
			zids.push( this.zReturnType.value );
		}
		this.fetchZKeys( { zids: zids } );

		// TODO(T314580): once the API supports it, this should be one call
		this.fetchZImplementations( this.getCurrentZObjectId );
		this.fetchZTesters( this.getCurrentZObjectId );
	}
};
</script>
