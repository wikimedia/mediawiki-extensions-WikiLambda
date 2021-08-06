<template>
	<!--
		WikiLambda Vue component for ZFunction objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<z-function-signature
			:arguments="getZargumentsString"
			:return-type="getZkeyLabels[ zReturnType.value ]"
		></z-function-signature>
		<div>
			{{ zReturnTypeLabel }}:
			<z-object-selector
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-return-typeselector-label' )"
				:selected-id="zReturnType.value"
				@input="updateZReturnType"
			></z-object-selector>
		</div>
		<z-argument-list
			:zobject-id="zArgumentId"
		></z-argument-list>
		<template v-if="!isCreateNewPage">
			<z-implementation-list
				:zobject-id="zImplementationId"
			></z-implementation-list>
			<z-tester-list
				:zobject-id="zTesterId"
			></z-tester-list>
			<z-function-tester-report
				:z-function-id="zFunctionId"
			></z-function-tester-report>
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
	ZFunctionSignature = require( '../ZFunctionSignature.vue' ),
	ZFunctionTesterReport = require( '../function/ZFunctionTesterReport.vue' );

module.exports = {
	components: {
		'z-argument-list': ZArgumentList,
		'z-object-selector': ZObjectSelector,
		'z-implementation-list': ZImplementationList,
		'z-tester-list': ZTesterList,
		'z-function-signature': ZFunctionSignature,
		'z-function-tester-report': ZFunctionTesterReport
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getNextObjectId',
			'getZObjectTypeById',
			'getZkeyLabels',
			'getZObjectAsJsonById',
			'getUserZlangZID',
			'getCurrentZObjectId',
			'getNestedZObjectById',
			'getZargumentsString',
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
			zImplementationList: function () {
				return this.getZObjectChildrenById( this.zImplementationId );
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
		this.fetchZKeys( zids );

		this.fetchZImplementations( this.getCurrentZObjectId );
		this.fetchZTesters( this.getCurrentZObjectId );
	}
};
</script>
