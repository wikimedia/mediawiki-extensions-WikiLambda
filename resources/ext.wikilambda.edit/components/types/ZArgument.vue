<template>
	<!--
		WikiLambda Vue component for ZArgument objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div>
			{{ typeLabel }}:
			<z-object-selector
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-argument-typeselector-label' )"
				:selected-id="argumentType"
				@input="typeHandler"
			></z-object-selector>
		</div>
		<div>
			{{ labelsLabel }}:
			<z-multilingual-string
				v-if="argumentLabelsId"
				:zobject-id="argumentLabelsId"
			></z-multilingual-string>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZString = require( './ZString.vue' ),
	ZMultilingualString = require( './ZMultilingualString.vue' );

// @vue/component
module.exports = {
	components: {
		'z-object-selector': ZObjectSelector,
		'z-multilingual-string': ZMultilingualString,
		'z-string': ZString
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			zKeyLabels: 'getZkeyLabels'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			Constants: function () {
				return Constants;
			},
			argumentTypeItem: function () {
				var argumentType = this.findKeyInArray( Constants.Z_ARGUMENT_TYPE, this.zobject );

				if ( argumentType.value === 'object' ) {
					return this.findKeyInArray(
						[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
						this.getZObjectChildrenById( argumentType.id )
					);
				}

				return argumentType;
			},
			argumentType: function () {
				if ( this.argumentTypeItem ) {
					return this.argumentTypeItem.value;
				}
			},
			argumentKeyId: function () {
				var item = this.findKeyInArray( Constants.Z_ARGUMENT_KEY, this.zobject );
				if ( item ) {
					return item.id;
				}
			},
			argumentLabelsId: function () {
				var item = this.findKeyInArray( Constants.Z_ARGUMENT_LABEL, this.zobject );
				if ( item ) {
					return item.id;
				}
			},
			typeLabel: function () {
				return this.zKeyLabels[ Constants.Z_ARGUMENT_TYPE ];
			},
			labelsLabel: function () {
				return this.zKeyLabels[ Constants.Z_ARGUMENT_LABEL ];
			}
		} ),
	methods: $.extend( mapActions( [ 'fetchZKeys', 'setZObjectValue' ] ), {
		typeHandler: function ( type ) {
			var payload = {
				id: this.argumentTypeItem.id,
				value: type
			};
			this.setZObjectValue( payload );
		}
	} ),
	mounted: function () {
		var zids = [ Constants.Z_ARGUMENT ];
		if ( this.argumentType ) {
			zids.push( this.argumentType );
		}
		this.fetchZKeys( zids );
	}
};
</script>
