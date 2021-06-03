<template>
	<!--
		WikiLambda Vue component for ZImplementation objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		{{ functionLabel }}: <z-object-selector
			:type="Constants.Z_FUNCTION"
			:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
			:selected-id="zFunction.value"
			@input="updateZFunctionType"
		></z-object-selector>
		<z-code
			:zobject-id="zCodeId"
		></z-code>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZCode = require( './ZCode.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' );

module.exports = {
	components: {
		'z-code': ZCode,
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( {},
		mapGetters( [ 'getZObjectChildrenById', 'getZkeyLabels' ] ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zFunction: function () {
				return this.findKeyInArray(
					Constants.Z_REFERENCE_ID,
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_IMPLEMENTATION_FUNCTION, this.zobject ).id
					)
				);
			},
			zCodeId: function () {
				return this.findKeyInArray( Constants.Z_IMPLEMENTATION_CODE, this.zobject ).id;
			},
			functionLabel: function () {
				return this.getZkeyLabels[ Constants.Z_IMPLEMENTATION_FUNCTION ];
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue' ] ),
		{
			updateZFunctionType: function ( val ) {
				this.setZObjectValue( {
					id: this.zFunction.id,
					value: val
				} );
			}
		}
	)
};
</script>
